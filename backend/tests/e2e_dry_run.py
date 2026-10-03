import time
import os
from playwright.sync_api import sync_playwright, expect

import sqlite3

FRONTEND_URL = "http://localhost:5173"
BACKEND_URL = "http://localhost:8000"

def get_latest_otp(phone):
    conn = sqlite3.connect("test_e2e.db")
    cursor = conn.cursor()
    # Read the OTP from sms_log
    cursor.execute("SELECT provider_response FROM sms_log WHERE to_phone=? ORDER BY id DESC LIMIT 1", (phone,))
    row = cursor.fetchone()
    conn.close()
    if row and row[0]:
        import json
        data = json.loads(row[0])
        msg = data.get("message", "")
        # extract the 6 digits
        import re
        match = re.search(r'\b\d{6}\b', msg)
        if match:
            return match.group(0)
    return "000000"


def run_e2e_test():
    print("Starting E2E Dry Run...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # 1. Public Registration
        print("1. Testing Public Registration...")
        page.goto(f"{FRONTEND_URL}/register")
        page.wait_for_load_state("networkidle")
        
        # Step 1: Phone
        try:
            page.fill('input#phone-input', '+233241234567')
        except Exception as e:
            page.screenshot(path="e2e_error.png")
            with open("e2e_page.html", "w") as f:
                f.write(page.content())
            raise e
        page.click('button:has-text("Send Verification Code")')
        
        # Step 2: OTP
        page.wait_for_selector('input[placeholder="000000"]')
        time.sleep(1) # wait for DB write
        otp = get_latest_otp("+233241234567")
        page.fill('input[placeholder="000000"]', otp)
        page.click('button:has-text("Verify Code")')
        
        # Step 3: Details
        page.wait_for_selector('input[placeholder="e.g. Kofi Mensah"]')
        page.fill('input[placeholder="e.g. Kofi Mensah"]', 'Dry Run Attendee')
        page.fill('input[placeholder="e.g. Grace Community Church"]', 'End to End Church')
        page.click('label:has(input[id="attended-before-no"])')
        page.click('button[type="submit"]')
        
        # Verify success and grab the ticket code
        page.wait_for_url(f"**/ticket/**")
        print("Registration successful!")
        
        # Grab ticket code from the ticket page
        ticket_code_element = page.wait_for_selector('#ticket-code', timeout=10000)
        ticket_code_text = ticket_code_element.inner_text()
        ticket_code = ticket_code_text.replace("-", "").strip()
        print(f"Obtained Ticket Code: {ticket_code}")

        # 2. Testimony Submission
        print("2. Testing Testimony Submission...")
        page.goto(f"{FRONTEND_URL}/testimony")
        page.wait_for_load_state("networkidle")
        
        page.fill('textarea[placeholder*="I attended the camp"]', 'This is an end-to-end test testimony of how great the system works!')
        # Select anonymous
        page.click('input[value="anonymous_no_name"]')
        # Check consent
        page.check('input[id="consent"]')
        page.click('button[type="submit"]')
        
        # Should show a success message
        expect(page.locator("text=Thank you!")).to_be_visible(timeout=5000)
        print("Testimony submitted successfully.")

        # 3. Admin Login
        print("3. Testing Admin Login...")
        page.goto(f"{FRONTEND_URL}/admin/login")
        page.wait_for_load_state("networkidle")
        
        # Use the seeded admin credentials from init_db.py or create a known one.
        # Assuming admin@example.com / admin123
        page.fill('input[type="email"]', 'admin@example.com')
        page.fill('input[type="password"]', 'admin123')
        page.click('button[type="submit"]')
        
        page.wait_for_url(f"**/admin/dashboard")
        expect(page.locator("h1:has-text('Dashboard')")).to_be_visible()
        print("Admin login successful.")

        # 4. Check-in (Lookup and Confirm)
        print("4. Testing Check-in System...")
        page.goto(f"{FRONTEND_URL}/check-in")
        page.wait_for_load_state("networkidle")
        
        # Fill search
        page.fill('input[placeholder*="Scan QR"]', ticket_code)
        
        # Wait for the results to appear
        expect(page.locator(f"text={ticket_code}")).to_be_visible()
        expect(page.locator("text=Dry Run Attendee")).to_be_visible()
        
        # Confirm Check-in
        page.click('button:has-text("Confirm Check-in")')
        
        # Give it a tiny moment to process the alert and reset
        page.wait_for_timeout(1000)
        print("Check-in confirmed successfully.")

        # 5. Walk-in Registration
        print("5. Testing Walk-in Registration...")
        page.click('button:has-text("Walk-in Registration")')
        
        page.fill('input[placeholder="Jane Doe"]', 'Walk-in User')
        # Use PhoneInput properly - might need to type into it directly
        phone_input = page.locator('input[type="tel"]')
        phone_input.clear()
        phone_input.type('+233249999999')
        
        page.fill('input[placeholder="e.g. Grace Temple"]', 'Walk-in Church')
        page.check('input[id="attended"]')
        
        page.click('button:has-text("Register & Check In")')
        
        # Accept the alert popup (Playwright auto-accepts by default, but we should listen)
        page.on("dialog", lambda dialog: dialog.accept())
        
        # Wait for form to reset (it switches back to search tab)
        expect(page.locator('input[placeholder*="Scan QR"]')).to_be_visible()
        print("Walk-in registration successful.")

        print("End-to-End Dry Run Completed Successfully!")
        browser.close()

def cleanup_test_db():
    conn = sqlite3.connect("test_e2e.db")
    c = conn.cursor()
    c.execute("DELETE FROM sms_log WHERE to_phone='+233241234567' OR to_phone='+233249999999'")
    c.execute("DELETE FROM otp_codes WHERE phone_e164='+233241234567' OR phone_e164='+233249999999'")
    c.execute("DELETE FROM registrations WHERE phone_e164='+233241234567' OR phone_e164='+233249999999'")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    cleanup_test_db()
    run_e2e_test()
