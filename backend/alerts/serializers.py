from rest_framework import serializers
from .models import AlertLog
from authentication.serializers import UserSerializer

class AlertLogSerializer(serializers.ModelSerializer):
    student_details = UserSerializer(source='student', read_only=True)
    sent_by_username = serializers.CharField(source='sent_by.username', read_only=True, default='System')
    book_title = serializers.CharField(source='loan_record.book.title', read_only=True, default='N/A')

    class Meta:
        model = AlertLog
        fields = [
            'id', 'student', 'student_details', 'loan_record', 'book_title',
            'phone_number', 'alert_type', 'message', 'channel', 'status',
            'sent_by_username', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class SendAlertRequestSerializer(serializers.Serializer):
    student_id = serializers.IntegerField(required=True)
    loan_id = serializers.IntegerField(required=False, allow_null=True)
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=25)
    alert_type = serializers.ChoiceField(choices=AlertLog.AlertType.choices, default=AlertLog.AlertType.DUE_SOON)
    channel = serializers.ChoiceField(choices=AlertLog.Channel.choices, default=AlertLog.Channel.BOTH)
    message = serializers.CharField(required=False, allow_blank=True)
