from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class Book(models.Model):
    title = models.CharField(max_length=255, db_index=True)
    author = models.CharField(max_length=255, db_index=True)
    isbn = models.CharField(max_length=13, unique=True, db_index=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='books')
    publisher = models.CharField(max_length=200)
    published_date = models.DateField()
    total_copies = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    available_copies = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    shelf_location = models.CharField(max_length=50, help_text="e.g., Section B, Shelf 4")
    description = models.TextField(blank=True)
    cover_image = models.ImageField(upload_to='book_covers/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['title', 'author']),
            models.Index(fields=['isbn']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(available_copies__gte=0) & models.Q(available_copies__lte=models.F('total_copies')),
                name='valid_available_copies_constraint'
            )
        ]

    def __str__(self):
        return f"{self.title} by {self.author} (ISBN: {self.isbn})"


class BorrowRecord(models.Model):
    class Status(models.TextChoices):
        ISSUED = 'ISSUED', 'Issued'
        RETURNED = 'RETURNED', 'Returned'
        OVERDUE = 'OVERDUE', 'Overdue'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='borrow_records')
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='borrow_records')
    borrow_date = models.DateField(default=timezone.now)
    due_date = models.DateField()
    return_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ISSUED, db_index=True)
    fine_amount = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal('0.00'))
    fine_paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-borrow_date']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['due_date']),
        ]

    def calculate_fine(self, per_day_rate=Decimal('2.00')):
        """Calculates overdue fine if return date is past due date."""
        effective_return_date = self.return_date or timezone.now().date()
        if effective_return_date > self.due_date:
            overdue_days = (effective_return_date - self.due_date).days
            return Decimal(overdue_days) * per_day_rate
        return Decimal('0.00')

    def __str__(self):
        return f"{self.user.username} - {self.book.title} ({self.status})"
