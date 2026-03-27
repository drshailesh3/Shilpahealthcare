# Shilpa Health Care Medico Pharma

Multi-Specialty Clinic, Pharmacy, and Diagnostics in Ambedkar Nagar, UP. Led by Dr. Shailesh.

## Deployment Instructions

To push this project to your GitHub repository and make it live on GitHub Pages, follow these steps in your local terminal:

1. **Initialize Git (if not already done):**
   ```bash
   git init
   ```

2. **Add the remote repository:**
   ```bash
   git remote add origin https://github.com/drshailesh3/Shilpahealthcare.git
   ```

3. **Run the deployment script:**
   ```bash
   bash deploy.sh
   ```
   *This script will build your project, commit the source code to the `main` branch, and deploy the live website to the `gh-pages` branch.*

4. **Configure GitHub Pages:**
   - Go to your repository on GitHub: `https://github.com/drshailesh3/Shilpahealthcare`
   - Click on **Settings** > **Pages** (on the left sidebar).
   - Under **Build and deployment**, set the **Source** to **Deploy from a branch**.
   - Select the **`gh-pages`** branch and the `/ (root)` folder.
   - Click **Save**.
   - Wait a few minutes, and your site will be live at `https://drshailesh3.github.io/Shilpahealthcare/`

## Features
- **Appointment Booking:** Patients can book appointments online.
- **Pharmacy Inventory:** Browse available medicines with real-time stock status.
- **Prescription Upload:** Securely upload prescriptions for review.
- **Admin Dashboard:** Manage appointments, pharmacy stock, and patient records.
- **Bilingual Support:** Content available in both English and Hindi.

## Tech Stack
- React + TypeScript
- Tailwind CSS
- Firebase (Auth & Firestore)
- Lucide Icons
- Framer Motion
