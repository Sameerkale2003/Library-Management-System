from django.db import models
from django.conf import settings

class AlertLog(models.Model):
    class AlertType(models.TextChoices):
        OVERDUE = 'OVERDUE', 'Overdue Alert'
        DUE_SOON = 'DUE_SOON', 'Due Date Reminder'
        RETURN_RECEIPT = 'RETURN_RECEIPT', 'Return Acknowledgment'
        CUSTOM = 'CUSTOM', 'Custom Message'

    class Channel(models.TextChoices):
        WHATSAPP = 'WHATSAPP', 'WhatsApp'
        SMS = 'SMS', 'SMS'
        BOTH = 'BOTH', 'WhatsApp & SMS'

    class Status(models.TextChoices):
        SENT = 'SENT', 'Sent'
        DELIVERED = 'DELIVERED', 'Delivered'
        FAILED = 'FAILED', 'Failed'

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_alerts'
    )
    loan_record = models.ForeignKey(
        'library.BorrowRecord',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alerts'
    )
    phone_number = models.CharField(max_length=25)
    alert_type = models.CharField(
        max_length=20,
        choices=AlertType.choices,
        default=AlertType.DUE_SOON
    )
    message = models.TextField()
    channel = models.CharField(
        max_length=20,
        choices=Channel.choices,
        default=Channel.BOTH
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SENT
    )
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dispatched_alerts'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Alert to {self.student.username} ({self.phone_number}) - {self.alert_type} [{self.status}]"
