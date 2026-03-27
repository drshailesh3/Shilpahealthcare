# Shilpa Health Care Medico Pharma

Multi-Specialty Clinic, Pharmacy, and Diagnostics in Ambedkar Nagar, UP. Led by Dr. Shailesh.

## Deployment Instructions

This project is configured with **GitHub Actions** for automated CI/CD. When you push your code to the `main` branch, GitHub Actions will automatically build the project and deploy it to GitHub Pages.

To push your changes and trigger a deployment, follow these steps in your local terminal:

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
   *This script will verify the build locally, commit the source code, and push it to the `main` branch. GitHub Actions will then take over and deploy the live website.*

4. **Configure GitHub Pages (One-time setup):**
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
