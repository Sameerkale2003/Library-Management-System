from django.urls import path
from .views import SendStudentAlertView, AlertLogListView

urlpatterns = [
    path('send-alert/', SendStudentAlertView.as_view(), name='send_student_alert'),
    path('logs/', AlertLogListView.as_view(), name='alert_logs'),
]
