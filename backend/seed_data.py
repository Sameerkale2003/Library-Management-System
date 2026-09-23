import os
import django
from datetime import timedelta
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'library_core.settings')
django.setup()

from django.utils import timezone
from authentication.models import User
from library.models import Category, Book, BorrowRecord

def seed():
    print("Seeding database on MySQL server...")

    # 1. Create Admin / Librarian
    admin_user, created = User.objects.get_or_create(username='admin', defaults={
        'email': 'admin@library.edu',
        'first_name': 'Chief',
        'last_name': 'Librarian',
        'role': User.Role.ADMIN,
        'is_staff': True,
        'is_superuser': True,
    })
    if created:
        admin_user.set_password('Admin@1234')
        admin_user.save()
        print("Created default Admin user: admin / Admin@1234")
    else:
        print("Admin user already exists.")

    # 2. Create Student
    student_user, created = User.objects.get_or_create(username='student', defaults={
        'email': 'student@library.edu',
        'first_name': 'John',
        'last_name': 'Doe',
        'role': User.Role.STUDENT,
    })
    if created:
        student_user.set_password('Student@1234')
        student_user.save()
        print("Created default Student user: student / Student@1234")
    else:
        print("Student user already exists.")

    # 3. Create Categories
    categories = [
        ("Computer Science", "computer-science"),
        ("Fiction & Literature", "fiction-literature"),
        ("Science & Nature", "science-nature"),
        ("History & Biography", "history-biography"),
        ("Economics & Business", "economics-business"),
    ]
    cat_objs = {}
    for name, slug in categories:
        cat, _ = Category.objects.get_or_create(name=name, defaults={'slug': slug})
        cat_objs[name] = cat

    # 4. Create Sample Books
    books_data = [
        {
            "title": "Clean Code: A Handbook of Agile Software Craftsmanship",
            "author": "Robert C. Martin",
            "isbn": "9780132350884",
            "category": cat_objs["Computer Science"],
            "publisher": "Prentice Hall",
            "published_date": "2008-08-01",
            "total_copies": 6,
            "available_copies": 5,
            "shelf_location": "CS-A1-04",
            "description": "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees.",
        },
        {
            "title": "Design Patterns: Elements of Reusable Object-Oriented Software",
            "author": "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides",
            "isbn": "9780201633610",
            "category": cat_objs["Computer Science"],
            "publisher": "Addison-Wesley",
            "published_date": "1994-10-31",
            "total_copies": 4,
            "available_copies": 3,
            "shelf_location": "CS-A2-12",
            "description": "Capturing a wealth of experience about the design of object-oriented software, four top-notch designers present a catalog of simple and succinct solutions.",
        },
        {
            "title": "Designing Data-Intensive Applications",
            "author": "Martin Kleppmann",
            "isbn": "9781449373320",
            "category": cat_objs["Computer Science"],
            "publisher": "O'Reilly Media",
            "published_date": "2017-03-16",
            "total_copies": 5,
            "available_copies": 4,
            "shelf_location": "CS-B3-08",
            "description": "The definitive guide to the architecture, storage engines, distributed consensus, and scalability of modern data systems.",
        },
        {
            "title": "To Kill a Mockingbird",
            "author": "Harper Lee",
            "isbn": "9780061120084",
            "category": cat_objs["Fiction & Literature"],
            "publisher": "Harper Perennial",
            "published_date": "2006-05-23",
            "total_copies": 8,
            "available_copies": 7,
            "shelf_location": "LIT-F1-02",
            "description": "The unforgettable novel of a childhood in a sleepy Southern town and the crisis of conscience that rocked it.",
        },
        {
            "title": "1984",
            "author": "George Orwell",
            "isbn": "9780451524935",
            "category": cat_objs["Fiction & Literature"],
            "publisher": "Signet Classic",
            "published_date": "1950-07-01",
            "total_copies": 10,
            "available_copies": 10,
            "shelf_location": "LIT-F2-15",
            "description": "Winston Smith toes the Party line, rewriting history to satisfy the Ministry of Truth. Yet his heart rebels against the totalitarian world.",
        },
        {
            "title": "A Brief History of Time",
            "author": "Stephen Hawking",
            "isbn": "9780553380163",
            "category": cat_objs["Science & Nature"],
            "publisher": "Bantam Books",
            "published_date": "1998-09-01",
            "total_copies": 3,
            "available_copies": 2,
            "shelf_location": "SCI-P4-01",
            "description": "A landmark volume in science writing by one of the great minds of our time, exploring black holes, expanding universe, and time.",
        },
        {
            "title": "Sapiens: A Brief History of Humankind",
            "author": "Yuval Noah Harari",
            "isbn": "9780062316097",
            "category": cat_objs["History & Biography"],
            "publisher": "Harper",
            "published_date": "2015-02-10",
            "total_copies": 5,
            "available_copies": 5,
            "shelf_location": "HIST-H1-09",
            "description": "From a renowned historian comes a groundbreaking narrative of humanity’s creation and evolution.",
        },
    ]

    book_objs = []
    for b_data in books_data:
        b, _ = Book.objects.get_or_create(isbn=b_data["isbn"], defaults=b_data)
        book_objs.append(b)

    # 5. Create Sample Borrow Records for the student
    today = timezone.now().date()
    
    # Active Loan (Clean Code)
    BorrowRecord.objects.get_or_create(
        user=student_user,
        book=book_objs[0],
        defaults={
            "borrow_date": today - timedelta(days=4),
            "due_date": today + timedelta(days=10),
            "status": BorrowRecord.Status.ISSUED,
            "fine_amount": Decimal('0.00'),
            "fine_paid": False
        }
    )

    # Overdue Loan (Design Patterns)
    BorrowRecord.objects.get_or_create(
        user=student_user,
        book=book_objs[1],
        defaults={
            "borrow_date": today - timedelta(days=20),
            "due_date": today - timedelta(days=6),
            "status": BorrowRecord.Status.ISSUED,
            "fine_amount": Decimal('12.00'),
            "fine_paid": False
        }
    )

    # Completed Loan (A Brief History of Time)
    BorrowRecord.objects.get_or_create(
        user=student_user,
        book=book_objs[5],
        defaults={
            "borrow_date": today - timedelta(days=30),
            "due_date": today - timedelta(days=16),
            "return_date": today - timedelta(days=14),
            "status": BorrowRecord.Status.RETURNED,
            "fine_amount": Decimal('4.00'),
            "fine_paid": True
        }
    )

    print("Data seeding completed successfully!")

if __name__ == '__main__':
    seed()
