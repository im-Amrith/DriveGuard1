#!/usr/bin/env python3
"""
Quick test script to verify SendGrid configuration
"""
import os
from dotenv import load_dotenv
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

load_dotenv()

def test_sendgrid():
    print("🧪 Testing SendGrid Configuration...")
    print("=" * 50)
    
    # Check environment variables
    api_key = os.environ.get('SENDGRID_API_KEY')
    sender_email = os.environ.get('SENDGRID_SENDER_EMAIL')
    
    print(f"📧 Sender Email: {sender_email}")
    print(f"🔑 API Key: {api_key[:20]}..." if api_key else "❌ API Key not found!")
    
    if not api_key:
        print("\n❌ SENDGRID_API_KEY not found in environment!")
        print("Add it to your .env file:")
        print('SENDGRID_API_KEY="your_key_here"')
        return False
    
    if not sender_email:
        print("\n❌ SENDGRID_SENDER_EMAIL not found in environment!")
        print("Add it to your .env file:")
        print('SENDGRID_SENDER_EMAIL="your_verified_email@example.com"')
        return False
    
    print("\n📤 Attempting to send test email...")
    
    try:
        # Send test email to the sender (yourself)
        message = Mail(
            from_email=sender_email,
            to_emails=sender_email,  # Send to yourself for testing
            subject='🧪 DriveGuard SendGrid Test',
            html_content='''
            <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h1 style="color: #4CAF50;">✅ SendGrid Test Successful!</h1>
                    <p>If you're reading this, your SendGrid integration is working correctly.</p>
                    <p><strong>Configuration:</strong></p>
                    <ul>
                        <li>API Key: Configured ✓</li>
                        <li>Sender Email: Verified ✓</li>
                        <li>Email Delivery: Working ✓</li>
                    </ul>
                    <p style="color: #999; font-size: 12px; margin-top: 30px;">
                        This is a test email from DriveGuard Emergency Contact System.
                    </p>
                </body>
            </html>
            '''
        )
        
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        
        print(f"✅ Email sent successfully!")
        print(f"📊 Status Code: {response.status_code}")
        print(f"📋 Response Body: {response.body}")
        print(f"📌 Headers: {response.headers}")
        
        if response.status_code in [200, 202]:
            print("\n" + "=" * 50)
            print("🎉 SUCCESS! Check your inbox at:")
            print(f"   {sender_email}")
            print("=" * 50)
            return True
        else:
            print(f"\n⚠️ Unexpected status code: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"\n❌ Error sending email: {e}")
        print("\nCommon issues:")
        print("1. API key is invalid or expired")
        print("2. Sender email is not verified in SendGrid")
        print("3. SendGrid account is not activated")
        print("4. API key doesn't have 'Mail Send' permission")
        return False

if __name__ == '__main__':
    test_sendgrid()
