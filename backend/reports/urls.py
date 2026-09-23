from django.urls import path
from .views import CirculationReportView, CirculationReportCSVExportView, BorrowSlipReceiptView

urlpatterns = [
    path('circulation/', CirculationReportView.as_view(), name='circulation_report'),
    path('circulation/export-csv/', CirculationReportCSVExportView.as_view(), name='circulation_report_csv'),
    path('borrow-slip/<int:loan_id>/', BorrowSlipReceiptView.as_view(), name='borrow_slip_receipt'),
]
