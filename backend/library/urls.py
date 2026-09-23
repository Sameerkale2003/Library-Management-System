from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookViewSet, CategoryViewSet, BorrowRecordViewSet, AdminDashboardAnalyticsView

router = DefaultRouter()
router.register(r'books', BookViewSet, basename='book')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'borrow-records', BorrowRecordViewSet, basename='borrow-record')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/analytics/', AdminDashboardAnalyticsView.as_view(), name='admin_analytics'),
]
