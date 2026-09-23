import urllib.parse
from datetime import date
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, generics
from .models import AlertLog
from .serializers import AlertLogSerializer, SendAlertRequestSerializer
from library.models import BorrowRecord
from library.permissions import IsAdminUserOnly

User = get_user_model()

class SendStudentAlertView(APIView):
    permission_classes = [IsAdminUserOnly]

    def post(self, request):
        serializer = SendAlertRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        student_id = serializer.validated_data['student_id']
        loan_id = serializer.validated_data.get('loan_id')
        custom_phone = serializer.validated_data.get('phone_number')
        alert_type = serializer.validated_data.get('alert_type', AlertLog.AlertType.DUE_SOON)
        channel = serializer.validated_data.get('channel', AlertLog.Channel.BOTH)
        custom_message = serializer.validated_data.get('message', '').strip()

        try:
            student = User.objects.get(id=student_id)
        except User.DoesNotExist:
            return Response({"error": "Student account not found."}, status=status.HTTP_404_NOT_FOUND)

        target_phone = (custom_phone or student.phone_number or '').strip()
        if not target_phone:
            return Response(
                {"error": "No phone number provided or found on student profile."},
                status=status.HTTP_400_BAD_REQUEST
            )

        loan_record = None
        days_held = 0
        days_overdue = 0
        book_title = "Library Book"
        due_date_str = "N/A"

        if loan_id:
            try:
                loan_record = BorrowRecord.objects.select_related('book', 'user').get(id=loan_id)
                book_title = loan_record.book.title
                due_date_str = loan_record.due_date.strftime("%Y-%m-%d")
                today = timezone.now().date()
                days_held = (today - loan_record.borrow_date).days

                if today > loan_record.due_date:
                    days_overdue = (today - loan_record.due_date).days
                    alert_type = AlertLog.AlertType.OVERDUE
            except BorrowRecord.DoesNotExist:
                pass

        # Compose message if not explicitly customized
        if custom_message:
            final_message = custom_message
        else:
            student_name = student.get_full_name() or student.username
            if days_overdue > 0:
                fine = loan_record.calculate_fine() if loan_record else "0.00"
                final_message = (
                    f"LIBRARY ALERT (OVERDUE): Hello {student_name}, your borrowed book '{book_title}' "
                    f"is OVERDUE by {days_overdue} day(s) (Due Date: {due_date_str}). "
                    f"You have had this book for {days_held} days. "
                    f"Current accrued fine: ${fine}. "
                    f"Please return it to the Central Library immediately."
                )
            else:
                final_message = (
                    f"LIBRARY REMINDER: Hello {student_name}, this is a gentle reminder regarding "
                    f"your borrowed book '{book_title}'. You have had this book for {days_held} day(s). "
                    f"The return due date is {due_date_str}. "
                    f"Thank you for returning on time!"
                )

        # Create alert record
        alert_log = AlertLog.objects.create(
            student=student,
            loan_record=loan_record,
            phone_number=target_phone,
            alert_type=alert_type,
            message=final_message,
            channel=channel,
            status=AlertLog.Status.SENT,
            sent_by=request.user
        )

        # Generate WhatsApp click-to-chat URL
        # Clean phone digits
        cleaned_phone = "".join([c for c in target_phone if c.isdigit()])
        encoded_msg = urllib.parse.quote(final_message)
        whatsapp_url = f"https://wa.me/{cleaned_phone}?text={encoded_msg}" if cleaned_phone else ""
        sms_uri = f"sms:{cleaned_phone}?body={encoded_msg}" if cleaned_phone else ""

        return Response({
            "message": "Alert recorded and prepared successfully.",
            "alert": AlertLogSerializer(alert_log).data,
            "whatsapp_url": whatsapp_url,
            "sms_uri": sms_uri,
            "recipient_phone": target_phone,
            "days_held": days_held,
            "days_overdue": days_overdue
        }, status=status.HTTP_201_CREATED)


class AlertLogListView(generics.ListAPIView):
    serializer_class = AlertLogSerializer
    permission_classes = [IsAdminUserOnly]

    def get_queryset(self):
        queryset = AlertLog.objects.select_related('student', 'loan_record', 'sent_by', 'loan_record__book').all()
        student_id = self.request.query_params.get('student_id')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        return queryset
