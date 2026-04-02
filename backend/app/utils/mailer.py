import os
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)

async def send_welcome_email(email: str):
    html = f"""
    <div style="font-family: sans-serif; color: #333;">
        <h2 style="color: #2f69a8;">Welcome to ChompSmart!</h2>
        <p>Thanks for signing up. We're excited to help you stay on track with your goals.</p>
        <p>You can now log in and start tracking your meals immediately.</p>
        <br/>
        <p>Best,<br/>The ChompSmart Team</p>
    </div>
    """
    
    message = MessageSchema(
        subject="Welcome to ChompSmart!",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )
    
    fm = FastMail(conf)
    await fm.send_message(message)