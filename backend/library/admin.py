from django.contrib import admin
from .models import Category, Book, BorrowRecord

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'isbn', 'category', 'total_copies', 'available_copies', 'shelf_location')
    list_filter = ('category', 'shelf_location')
    search_fields = ('title', 'author', 'isbn')

@admin.register(BorrowRecord)
class BorrowRecordAdmin(admin.ModelAdmin):
    list_display = ('user', 'book', 'borrow_date', 'due_date', 'return_date', 'status', 'fine_amount', 'fine_paid')
    list_filter = ('status', 'fine_paid')
    search_fields = ('user__username', 'book__title', 'book__isbn')
