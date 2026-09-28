# Dnyrix

Dnyrix is a static GitHub Pages website that hosts a personal file download center for ZIP and RAR archives.

## Architecture

The site uses:

- Firebase Authentication for admin login
- Firestore for file metadata only
- GitHub Releases for actual downloadable ZIP/RAR files
- GitHub Pages for the public website

This design keeps the frontend static and avoids paying for Firebase Storage.

## Firebase setup

1. Create a Firebase project.
2. Add a web app.
3. Copy the web configuration values into `firebase/firebase-config.js`.
4. Enable Email/Password authentication in Firebase Authentication.
5. Create Firestore.
6. Create an `admins` collection with one document per approved admin UID.
7. Example admin document:

```json
{
  "role": "admin"
}
```

The admin user must have a Firebase UID that exists in the `admins` collection.

## Firestore setup

Create a `files` collection in Firestore.

Each document should contain metadata like:

```json
{
  "name": "My Archive",
  "originalName": "my-archive.zip",
  "type": "ZIP",
  "size": "1.2 MB",
  "version": "1.0.0",
  "description": "Project archive for release distribution.",
  "downloadURL": "https://github.com/USERNAME/REPOSITORY/releases/download/v1.0.0/my-archive.zip",
  "releaseURL": "https://github.com/USERNAME/REPOSITORY/releases/tag/v1.0.0",
  "uploadedAt": "server timestamp",
  "uploadedBy": "admin uid",
  "published": true
}
```

Do not store ZIP/RAR file contents in Firestore.

## GitHub Releases workflow

1. Go to your GitHub repository.
2. Open the Releases page.
3. Create a new release tag, for example `v1.0.0`.
4. Upload the ZIP or RAR as a release asset.
5. Copy the asset URL from the release page.
6. Example:

```text
https://github.com/USERNAME/REPOSITORY/releases/download/v1.0.0/my-archive.zip
```

7. Open Dnyrix Admin.
8. Click `+ Add Download`.
9. Fill in the metadata and paste the GitHub asset URL.
10. Click `Add Download`.

The file will appear on the public Dnyrix website after the Firestore record is saved.

## Admin account creation

Create the admin account through Firebase Authentication in the Firebase Console.

Do not build a public sign-up page.

## Security rules

Use Firebase Security Rules so that:

- Public users can read published files only.
- Public users cannot create, edit, or delete files.
- Only approved admin UIDs can create, update, or delete file metadata.

Do not place any GitHub token, app private key, or password in frontend JavaScript or the repository.

## Important security note

GitHub Pages is a static frontend. All JavaScript is visible to the browser. That means no GitHub credentials should ever be placed in:

- JavaScript files
- HTML files
- CSS files
- Firestore documents
- browser localStorage or sessionStorage
- the GitHub repository

If a secure server-side upload system is needed later, it should be implemented with a backend or serverless function. Do not implement a token-based upload trick in public frontend code.

## Editing and deleting file listings

- Use the admin dashboard to edit metadata for a file.
- Use the delete button to remove the Firestore record from Dnyrix.
- The actual GitHub Release asset remains in GitHub and is intentionally not deleted from the browser.

## Why this architecture is safe for GitHub Pages

This setup keeps the public frontend fully static and avoids requiring a backend. The GitHub Release asset hosting step is manual, but it is also secure because the browser only receives the public download URL and no private credentials are exposed.
