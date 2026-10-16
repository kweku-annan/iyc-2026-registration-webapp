# 📸 IYC 2026 — Photo Gallery Management Manual

This guide explains how administrators and organizers can manage photos, categories, tags, and descriptions directly from the **Admin Dashboard UI** without touching any code.

---

## 🚀 Recommended: Manage Everything from the Admin Dashboard (No Code)

You can manage all gallery photos, upload new ones, create custom tags, or hide/remove images by logging into the Admin Dashboard:

👉 **Navigate to: `/admin/gallery`** (accessible from the sidebar as **"Gallery"**)

### Key Capabilities in the Admin Dashboard:
1. **Upload New Photos**:
   * Click **"+ Upload New Photo"**.
   * Drag-and-drop or choose any photo from your phone or computer (JPEG, PNG, WebP up to 15 MB).
   * Enter a title and optional description.
   * **Tags & Categories**: Select an existing tag (*Worship & Praise*, *Word & Ministry*, *Fellowship & Community*, *Camp Atmosphere*) **OR** click `+ Add New Custom Tag` to type your own tag (e.g. *Youth Choir*, *Prayer Night*, *Sports*).
   * Click **"Upload & Publish"**.
   * *The backend automatically sanitizes the filename into a clean slug, converts the image to optimized high-res and thumbnail WebP files, measures dimensions, and publishes it to the site.*

2. **1-Click Hide / Show (Visibility Toggle)**:
   * Each photo card has an eye icon button (**"Hide" / "Show"**).
   * Clicking **"Hide"** removes the photo from the public landing page and full gallery immediately without deleting the file.
   * Clicking **"Show"** restores it back to public view.

3. **Edit Details & Re-Tagging**:
   * Click the **pencil icon** on any photo card to edit its title, description, or change its category tag at any time.

4. **Delete Permanently**:
   * Click the **trash can icon** to permanently delete the photo from the database and remove the WebP files from the server.

---

## ❓ Is an Image Upload Limit Necessary?

**Yes, absolutely.** A per-file upload limit (we set it to **15 MB**) is essential:
1. **Server Memory Protection**: When a server processes an image with Pillow to convert it to WebP, it must decompress the full pixel bitmap into server RAM. A single 50–100MB camera RAW file can expand to over 1GB of memory during processing, which can cause an Out-Of-Memory (OOM) server crash on cloud instances like Railway.
2. **Network Reliability**: Uploading 30MB+ files over mobile connections in conference venues frequently leads to network drops or HTTP gateway timeouts.
3. **15 MB is very generous**: High-resolution smartphone and DSLR JPEG/PNG photos are typically 2 MB to 8 MB, so 15 MB allows full quality while keeping the server safe and responsive.

---

## 🗄️ Production Deployment Note (Local Filesystem Storage)

Since we are using local file uploads instead of a cloud bucket (S3/Cloudinary):
* In development, files are saved in `uploads/gallery/` and served via FastAPI.
* On **Railway** (or Docker in production):
  * Container filesystems reset when the app redeploys.
  * **To keep uploaded photos permanent in production**: Go to your backend service settings on [railway.app](https://railway.app), click **Volumes**, and attach a **Persistent Volume** mounted at `/app/uploads`. That’s it! Any file uploaded via the Admin UI will persist permanently across all deployments without needing AWS S3.

---

## 🔍 Initial 40 Photos Reference Table

| Photo ID | Original File in `iyc-project-images` | Category | Title |
| :--- | :--- | :--- | :--- |
| **`iyc2025-001`** | `WhatsApp Image ... 10.23.33 (1).jpeg` | Worship & Praise | Night of Holy Reverence |
| **`iyc2025-002`** | `WhatsApp Image ... 10.23.33 (2).jpeg` | Worship & Praise | Youth Arise in Praise |
| **`iyc2025-003`** | `WhatsApp Image ... 10.23.33.jpeg` | Camp Atmosphere | Under the Open Skies |
| **`iyc2025-004`** | `WhatsApp Image ... 10.23.34 (1).jpeg` | Word & Ministry | Moments of Deep Contemplation |
| **`iyc2025-005`** | `WhatsApp Image ... 10.23.34.jpeg` | Word & Ministry | United in One Accord |
| **`iyc2025-006`** | `WhatsApp Image ... 10.23.37 (1).jpeg` | Fellowship & Community | Joy of Christian Fellowship |
| **`iyc2025-007`** | `WhatsApp Image ... 10.23.37.jpeg` | Worship & Praise | The Sound of Worship |
| **`iyc2025-008`** | `WhatsApp Image ... 10.23.38 (1).jpeg` | Word & Ministry | Impartation & Ministry |
| **`iyc2025-009`** | `WhatsApp Image ... 10.23.38 (2).jpeg` | Camp Atmosphere | Morning Sunlight on Camp Grounds |
| **`iyc2025-010`** | `WhatsApp Image ... 10.23.38.jpeg` | Worship & Praise | Evening Revival Rally |
| **`iyc2025-011`** | `WhatsApp Image ... 10.23.39 (1).jpeg` | Fellowship & Community | Brothers & Sisters in Christ |
| **`iyc2025-012`** | `WhatsApp Image ... 10.23.39 (2).jpeg` | Word & Ministry | A Generation Set Apart |
| **`iyc2025-013`** | `WhatsApp Image ... 10.23.39.jpeg` | Worship & Praise | Lifting Holy Hands |
| **`iyc2025-014`** | `WhatsApp Image ... 10.23.40 (1).jpeg` | Fellowship & Community | Heart-to-Heart Discussions |
| **`iyc2025-015`** | `WhatsApp Image ... 10.23.40 (2).jpeg` | Worship & Praise | Anointed Praise Session |
| **`iyc2025-016`** | `WhatsApp Image ... 10.23.40.jpeg` | Word & Ministry | Deep Calls Unto Deep |
| **`iyc2025-017`** | `WhatsApp Image ... 10.23.42 (1).jpeg` | Camp Atmosphere | Campers Gathering for Service |
| **`iyc2025-018`** | `WhatsApp Image ... 10.23.42 (2).jpeg` | Worship & Praise | Voices of Thanksgiving |
| **`iyc2025-019`** | `WhatsApp Image ... 10.23.42.jpeg` | Word & Ministry | Hearing the Voice of God |
| **`iyc2025-020`** | `WhatsApp Image ... 10.23.43 (1).jpeg` | Worship & Praise | Joyful Youth Choir |
| **`iyc2025-021`** | `WhatsApp Image ... 10.23.43 (2).jpeg` | Camp Atmosphere | Camp Meeting Sunset |
| **`iyc2025-022`** | `WhatsApp Image ... 10.23.43 (3).jpeg` | Word & Ministry | Intercessory Circle |
| **`iyc2025-023`** | `WhatsApp Image ... 10.23.43.jpeg` | Word & Ministry | A Feast of the Word |
| **`iyc2025-024`** | `WhatsApp Image ... 10.23.44 (1).jpeg` | Fellowship & Community | Unbroken Bonds |
| **`iyc2025-025`** | `WhatsApp Image ... 10.23.44.jpeg` | Camp Atmosphere | Atmosphere of Expectation |
| **`iyc2025-026`** | `WhatsApp Image ... 10.23.45 (1).jpeg` | Worship & Praise | Praise in the Sanctuary |
| **`iyc2025-027`** | `WhatsApp Image ... 10.23.45 (2).jpeg` | Fellowship & Community | Shared Smiles & Memories |
| **`iyc2025-028`** | `WhatsApp Image ... 10.23.45.jpeg` | Word & Ministry | Altar Call Surrender |
| **`iyc2025-029`** | `WhatsApp Image ... 10.23.46.jpeg` | Fellowship & Community | Campgrounds in Fellowship |
| **`iyc2025-030`** | `WhatsApp Image ... 10.23.47 (1).jpeg` | Worship & Praise | Full Auditorium at Capacity |
| **`iyc2025-031`** | `WhatsApp Image ... 10.23.47.jpeg` | Word & Ministry | Moments of Grace |
| **`iyc2025-032`** | `WhatsApp Image ... 10.23.49 (1).jpeg` | Fellowship & Community | Youth Leadership in Action |
| **`iyc2025-033`** | `WhatsApp Image ... 10.23.49 (2).jpeg` | Word & Ministry | The Fire of Revival |
| **`iyc2025-034`** | `WhatsApp Image ... 10.23.49 (3).jpeg` | Worship & Praise | Generations Standing Together |
| **`iyc2025-035`** | `WhatsApp Image ... 10.23.49 (4).jpeg` | Fellowship & Community | Communal Meal & Conversation |
| **`iyc2025-036`** | `WhatsApp Image ... 10.23.49.jpeg` | Fellowship & Community | Radiant in His Light |
| **`iyc2025-037`** | `WhatsApp Image ... 10.23.50 (2).jpeg` | Word & Ministry | Diligence in the Word |
| **`iyc2025-038`** | `WhatsApp Image ... 10.23.51 (2).jpeg` | Worship & Praise | Celebration of Faith |
| **`iyc2025-039`** | `WhatsApp Image ... 10.23.51 (3).jpeg` | Camp Atmosphere | Evening Reflections |
| **`iyc2025-040`** | `WhatsApp Image ... 10.23.52.jpeg` | Worship & Praise | Departing with the Fire |
