from datetime import timedelta
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Book, Category, BorrowRecord
from .serializers import BookSerializer, CategorySerializer, BorrowRecordSerializer
from .permissions import IsLibrarianOrReadOnly, IsAdminUserOnly

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.annotate(book_count=Count('books')).all()
    serializer_class = CategorySerializer
    permission_classes = [IsLibrarianOrReadOnly]
    search_fields = ['name']
    filter_backends = [filters.SearchFilter]


class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.select_related('category').all()
    serializer_class = BookSerializer
    permission_classes = [IsLibrarianOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'publisher']
    search_fields = ['title', 'author', 'isbn']
    ordering_fields = ['title', 'published_date', 'available_copies', 'created_at']

    def destroy(self, request, *args, **kwargs):
        book = self.get_object()
        active_loans_count = book.borrow_records.filter(status=BorrowRecord.Status.ISSUED).count()
        if active_loans_count > 0:
            return Response(
                {
                    "error": f"Cannot delete '{book.title}'. There are currently {active_loans_count} active loan(s) checked out to students. Please ensure all copies are returned before deleting."
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def categories_summary(self, request):
        categories = Category.objects.annotate(total_books=Count('books'))
        return Response(CategorySerializer(categories, many=True).data)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUserOnly], url_path='clear-demo-books')
    def clear_demo_books(self, request):
        demo_isbns = [
            "9780132350884",  # Clean Code
            "9780201633610",  # Design Patterns
            "9781449373320",  # Designing Data-Intensive Applications
            "9780061120084",  # To Kill a Mockingbird
            "9780451524935",  # 1984
            "9780553380163",  # A Brief History of Time
            "9780062316097",  # Sapiens
        ]
        with transaction.atomic():
            demo_books = Book.objects.filter(isbn__in=demo_isbns)
            count = demo_books.count()
            BorrowRecord.objects.filter(book__in=demo_books).delete()
            demo_books.delete()
        return Response({"message": f"Successfully deleted {count} demo books and associated records."})


class BorrowRecordViewSet(viewsets.ModelViewSet):
    serializer_class = BorrowRecordSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'fine_paid']
    ordering_fields = ['borrow_date', 'due_date']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return BorrowRecord.objects.select_related('user', 'book').all()
        return BorrowRecord.objects.select_related('user', 'book').filter(user=user)

    @action(detail=False, methods=['post'], url_path='issue-book')
    def issue_book(self, request):
        """
        Concurrency-safe book issue using select_for_update inside an atomic transaction.
        """
        user_id = request.data.get('user_id') or request.user.id
        book_id = request.data.get('book_id')
        days = int(request.data.get('days', 14))

        if not book_id:
            return Response({"error": "book_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            try:
                book = Book.objects.select_for_update().get(id=book_id)
            except Book.DoesNotExist:
                return Response({"error": "Book not found."}, status=status.HTTP_404_NOT_FOUND)

            if book.available_copies <= 0:
                return Response(
                    {"error": "No copies available for checkout at this moment."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if user already has an active loan of this book
            active_existing = BorrowRecord.objects.filter(
                user_id=user_id, book_id=book_id, status=BorrowRecord.Status.ISSUED
            ).exists()
            if active_existing:
                return Response(
                    {"error": "User already has an active borrowed copy of this book."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Decrement and issue
            book.available_copies -= 1
            book.save(update_fields=['available_copies'])

            borrow_record = BorrowRecord.objects.create(
                user_id=user_id,
                book=book,
                borrow_date=timezone.now().date(),
                due_date=timezone.now().date() + timedelta(days=days),
                status=BorrowRecord.Status.ISSUED
            )

        serializer = self.get_serializer(borrow_record)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='return-book')
    def return_book(self, request, pk=None):
        """
        Return book, increment stock, and calculate overdue fine.
        """
        with transaction.atomic():
            try:
                record = BorrowRecord.objects.select_for_update().select_related('book').get(pk=pk)
            except BorrowRecord.DoesNotExist:
                return Response({"error": "Borrow record not found."}, status=status.HTTP_404_NOT_FOUND)

            if record.status == BorrowRecord.Status.RETURNED:
                return Response({"error": "Book has already been returned."}, status=status.HTTP_400_BAD_REQUEST)

            record.return_date = timezone.now().date()
            record.status = BorrowRecord.Status.RETURNED
            record.fine_amount = record.calculate_fine(per_day_rate=Decimal('2.00'))
            record.save()

            # Increment inventory
            book = Book.objects.select_for_update().get(id=record.book_id)
            book.available_copies += 1
            book.save(update_fields=['available_copies'])

        return Response({
            "message": "Book returned successfully.",
            "return_date": record.return_date,
            "fine_amount": str(record.fine_amount),
            "fine_paid": record.fine_paid
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='pay-fine')
    def pay_fine(self, request, pk=None):
        record = self.get_object()
        if record.fine_amount <= 0:
            return Response({"error": "No outstanding fine on this record."}, status=status.HTTP_400_BAD_REQUEST)
        record.fine_paid = True
        record.save(update_fields=['fine_paid'])
        return Response({"message": "Fine marked as paid."})


class AdminDashboardAnalyticsView(APIView):
    permission_classes = [IsAdminUserOnly]

    def get(self, request):
        today = timezone.now().date()

        total_books = Book.objects.aggregate(total=Sum('total_copies'))['total'] or 0
        total_unique_titles = Book.objects.count()
        active_loans = BorrowRecord.objects.filter(status=BorrowRecord.Status.ISSUED).count()
        overdue_books = BorrowRecord.objects.filter(
            status=BorrowRecord.Status.ISSUED,
            due_date__lt=today
        ).count()

        fines_collected = BorrowRecord.objects.filter(
            fine_paid=True
        ).aggregate(collected=Sum('fine_amount'))['collected'] or Decimal('0.00')

        pending_fines = BorrowRecord.objects.filter(
            fine_paid=False,
            fine_amount__gt=0
        ).aggregate(pending=Sum('fine_amount'))['pending'] or Decimal('0.00')

        return Response({
            "total_books": total_books,
            "total_unique_titles": total_unique_titles,
            "active_loans": active_loans,
            "overdue_books": overdue_books,
            "total_fines_collected": str(fines_collected),
            "pending_fines": str(pending_fines),
        })
