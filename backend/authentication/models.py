import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin/Librarian'
        STUDENT = 'STUDENT', 'Student/Member'

    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.STUDENT,
        db_index=True
    )
    membership_id = models.CharField(max_length=32, unique=True, editable=False, null=True, blank=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.membership_id:
            prefix = "LIB" if self.role == self.Role.ADMIN else "STU"
            self.membership_id = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()}) - {self.membership_id}"
