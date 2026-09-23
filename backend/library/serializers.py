from rest_framework import serializers
from .models import Book, Category, BorrowRecord
from authentication.serializers import UserSerializer

class CategorySerializer(serializers.ModelSerializer):
    book_count = serializers.IntegerField(source='books.count', read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'book_count']

class BookSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    cover_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            'id', 'title', 'author', 'isbn', 'category', 'category_name',
            'publisher', 'published_date', 'total_copies', 'available_copies',
            'shelf_location', 'description', 'cover_image', 'cover_image_url',
            'created_at'
        ]

    def get_cover_image_url(self, obj):
        if obj.cover_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover_image.url)
            return obj.cover_image.url
        return None

    def validate(self, data):
        total = data.get('total_copies', getattr(self.instance, 'total_copies', None))
        avail = data.get('available_copies', getattr(self.instance, 'available_copies', None))
        if total is not None and avail is not None:
            if avail > total:
                raise serializers.ValidationError({
                    "available_copies": "Available copies cannot exceed total copies."
                })
        return data

from django.utils import timezone

class BorrowRecordSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    book_details = BookSerializer(source='book', read_only=True)
    days_held = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    days_overdue = serializers.SerializerMethodField()
    effective_fine = serializers.SerializerMethodField()

    class Meta:
        model = BorrowRecord
        fields = [
            'id', 'user', 'user_details', 'book', 'book_details',
            'borrow_date', 'due_date', 'return_date', 'status',
            'fine_amount', 'fine_paid', 'created_at',
            'days_held', 'is_overdue', 'days_overdue', 'effective_fine'
        ]
        read_only_fields = ['borrow_date', 'return_date', 'status', 'fine_amount']

    def get_days_held(self, obj):
        today = timezone.now().date()
        effective_end = obj.return_date or today
        return max((effective_end - obj.borrow_date).days, 0)

    def get_is_overdue(self, obj):
        today = timezone.now().date()
        if obj.status == BorrowRecord.Status.RETURNED:
            return bool(obj.return_date and obj.return_date > obj.due_date)
        return bool(today > obj.due_date)

    def get_days_overdue(self, obj):
        today = timezone.now().date()
        if obj.status == BorrowRecord.Status.RETURNED:
            if obj.return_date and obj.return_date > obj.due_date:
                return (obj.return_date - obj.due_date).days
            return 0
        if today > obj.due_date:
            return (today - obj.due_date).days
        return 0

    def get_effective_fine(self, obj):
        if obj.status == BorrowRecord.Status.ISSUED:
            return str(obj.calculate_fine())
        return str(obj.fine_amount)
