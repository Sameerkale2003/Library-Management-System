import csv
import io
from datetime import datetime, date
from decimal import Decimal
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from library.models import BorrowRecord
from library.permissions import IsAdminUserOnly

def compute_record_metrics(record, today):
    """Calculate days held, overdue days, and effective fine for a loan record."""
    effective_end = record.return_date or today
    days_held = max((effective_end - record.borrow_date).days, 0)

    is_overdue = False
    days_overdue = 0

    if record.status == BorrowRecord.Status.RETURNED:
        if record.return_date and record.return_date > record.due_date:
            is_overdue = True
            days_overdue = (record.return_date - record.due_date).days
    else:
        if today > record.due_date:
            is_overdue = True
            days_overdue = (today - record.due_date).days

    return {
        "days_held": days_held,
        "is_overdue": is_overdue,
        "days_overdue": days_overdue,
    }


def filter_borrow_queryset(queryset, query_params, today):
    status_filter = query_params.get('status', '').strip().upper()
    start_date = query_params.get('start_date')
    end_date = query_params.get('end_date')
    search = query_params.get('search', '').strip()

    if start_date:
        queryset = queryset.filter(borrow_date__gte=start_date)
    if end_date:
        queryset = queryset.filter(borrow_date__lte=end_date)

    if status_filter == 'ISSUED':
        queryset = queryset.filter(status=BorrowRecord.Status.ISSUED, due_date__gte=today)
    elif status_filter == 'OVERDUE':
        queryset = queryset.filter(status=BorrowRecord.Status.ISSUED, due_date__lt=today)
    elif status_filter == 'RETURNED':
        queryset = queryset.filter(status=BorrowRecord.Status.RETURNED)

    if search:
        queryset = queryset.filter(
            Q(user__username__icontains=search) |
            Q(user__first_name__icontains=search) |
            Q(user__last_name__icontains=search) |
            Q(user__membership_id__icontains=search) |
            Q(user__phone_number__icontains=search) |
            Q(book__title__icontains=search) |
            Q(book__isbn__icontains=search)
        )

    return queryset


class CirculationReportView(APIView):
    """
    Returns structured circulation report with student loan durations,
    days held, due dates, fines, and contact info.
    """
    permission_classes = [IsAdminUserOnly]

    def get(self, request):
        today = timezone.now().date()
        qs = BorrowRecord.objects.select_related('user', 'book', 'book__category').all().order_by('-borrow_date')
        qs = filter_borrow_queryset(qs, request.query_params, today)

        records = []
        total_fines_accrued = Decimal('0.00')

        for rec in qs:
            metrics = compute_record_metrics(rec, today)
            effective_fine = rec.calculate_fine() if rec.status == BorrowRecord.Status.ISSUED else rec.fine_amount
            total_fines_accrued += effective_fine

            records.append({
                "loan_id": rec.id,
                "student_id": rec.user.id,
                "student_username": rec.user.username,
                "student_name": rec.user.get_full_name() or rec.user.username,
                "student_membership_id": rec.user.membership_id or "N/A",
                "student_phone": rec.user.phone_number or "N/A",
                "student_email": rec.user.email or "N/A",
                "book_id": rec.book.id,
                "book_title": rec.book.title,
                "book_isbn": rec.book.isbn,
                "book_shelf": rec.book.shelf_location or "Main",
                "borrow_date": rec.borrow_date.strftime("%Y-%m-%d"),
                "due_date": rec.due_date.strftime("%Y-%m-%d"),
                "return_date": rec.return_date.strftime("%Y-%m-%d") if rec.return_date else None,
                "status": "OVERDUE" if metrics["is_overdue"] and rec.status == BorrowRecord.Status.ISSUED else rec.status,
                "days_held": metrics["days_held"],
                "is_overdue": metrics["is_overdue"],
                "days_overdue": metrics["days_overdue"],
                "fine_amount": str(effective_fine),
                "fine_paid": rec.fine_paid,
            })

        return Response({
            "report_date": today.strftime("%Y-%m-%d"),
            "total_records": len(records),
            "total_fines_accrued": str(total_fines_accrued),
            "records": records,
        })


class CirculationReportCSVExportView(APIView):
    """
    Streams a CSV file containing the complete circulation report.
    """
    permission_classes = [IsAdminUserOnly]

    def get(self, request):
        today = timezone.now().date()
        qs = BorrowRecord.objects.select_related('user', 'book', 'book__category').all().order_by('-borrow_date')
        qs = filter_borrow_queryset(qs, request.query_params, today)

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        response['Content-Disposition'] = f'attachment; filename="library_circulation_report_{timestamp}.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Loan ID',
            'Student Name',
            'Student Username',
            'Membership ID',
            'Student Phone',
            'Student Email',
            'Book Title',
            'Book ISBN',
            'Shelf Location',
            'Borrow Date',
            'Due Date',
            'Return Date',
            'Days Held',
            'Days Overdue',
            'Status',
            'Fine Amount ($)',
            'Fine Paid'
        ])

        for rec in qs:
            metrics = compute_record_metrics(rec, today)
            effective_fine = rec.calculate_fine() if rec.status == BorrowRecord.Status.ISSUED else rec.fine_amount
            display_status = "OVERDUE" if metrics["is_overdue"] and rec.status == BorrowRecord.Status.ISSUED else rec.status

            writer.writerow([
                rec.id,
                rec.user.get_full_name() or rec.user.username,
                rec.user.username,
                rec.user.membership_id or '',
                rec.user.phone_number or '',
                rec.user.email or '',
                rec.book.title,
                rec.book.isbn,
                rec.book.shelf_location or '',
                rec.borrow_date.strftime("%Y-%m-%d"),
                rec.due_date.strftime("%Y-%m-%d"),
                rec.return_date.strftime("%Y-%m-%d") if rec.return_date else 'Still Issued',
                metrics["days_held"],
                metrics["days_overdue"],
                display_status,
                str(effective_fine),
                'Yes' if rec.fine_paid else 'No'
            ])

        return response


class BorrowSlipReceiptView(APIView):
    """
    Generates official borrow proof slip metadata for a student loan.
    Accessible to the loan's student or any librarian.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, loan_id):
        try:
            rec = BorrowRecord.objects.select_related('user', 'book', 'book__category').get(id=loan_id)
        except BorrowRecord.DoesNotExist:
            return Response({"error": "Loan record not found."}, status=status.HTTP_404_NOT_FOUND)

        # Authorization: Only the student or a librarian can access this borrow slip
        if request.user.role != 'ADMIN' and request.user.id != rec.user.id:
            return Response({"error": "Unauthorized to view this borrow proof slip."}, status=status.HTTP_403_FORBIDDEN)

        today = timezone.now().date()
        metrics = compute_record_metrics(rec, today)

        verification_code = f"CHK-{rec.id:05d}-{'%04d' % (rec.user.id * 17 % 10000)}"

        slip_data = {
            "slip_number": f"SLIP-{rec.id:06d}",
            "transaction_ref": verification_code,
            "issue_date": rec.borrow_date.strftime("%B %d, %Y"),
            "due_date": rec.due_date.strftime("%B %d, %Y"),
            "return_date": rec.return_date.strftime("%B %d, %Y") if rec.return_date else None,
            "days_allocated": (rec.due_date - rec.borrow_date).days,
            "days_held": metrics["days_held"],
            "days_overdue": metrics["days_overdue"],
            "status": rec.status,
            "fine_assessed": str(rec.fine_amount),
            "fine_paid": rec.fine_paid,
            "library": {
                "name": "Central Academic Library",
                "branch": "Main University Campus",
                "address": "400 University Blvd, Library Wing A",
                "phone": "+1 (555) 019-2834",
                "email": "circulation@universitylibrary.edu",
            },
            "student": {
                "id": rec.user.id,
                "name": rec.user.get_full_name() or rec.user.username,
                "username": rec.user.username,
                "membership_id": rec.user.membership_id or "STU-PENDING",
                "phone_number": rec.user.phone_number or "Not registered",
                "email": rec.user.email or "N/A",
            },
            "book": {
                "id": rec.book.id,
                "title": rec.book.title,
                "author": rec.book.author,
                "isbn": rec.book.isbn,
                "category": rec.book.category.name if rec.book.category else "General",
                "shelf_location": rec.book.shelf_location or "Stack A",
                "publisher": rec.book.publisher,
            },
            "terms": [
                "This document is an official proof of book issuance from Central Academic Library.",
                "The borrower is fully responsible for the care, custody, and condition of this volume.",
                "Late returns accrue fines at the standard statutory rate of $2.00 per overdue calendar day.",
                "Please present this slip or your Membership ID upon checking in the volume at the circulation desk."
            ]
        }

        return Response(slip_data)
