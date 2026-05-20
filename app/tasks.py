from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings


def send_password_email(email, first_name, phone_number, password):
    subject = 'Welcome to Fitness Club'
    message = f"""
Hello {first_name},

Your account has been created successfully.

Your login credentials:
Phone: {phone_number}
Password: {password}

Please use these credentials to log in.

Fitness Club Team
"""
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])