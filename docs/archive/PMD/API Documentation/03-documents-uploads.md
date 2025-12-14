# Documents & Uploads API

This document covers all file upload, document management, and media handling endpoints.

---

## Table of Contents

1. [Upload Policy](#upload-policy)
2. [Upload Files](#upload-files)
3. [Download Files](#download-files)
4. [Document Types](#document-types)
5. [Photo Management](#photo-management)

---

## Upload Policy

### Get Upload Policy

Retrieves current file upload restrictions and limits.

**Endpoint:** `GET /api/settings/upload-policy`

**Authentication:** Required

**Success Response:** `200 OK`

```json
{
  "maxFileSizeMB": 20,
  "maxTotalSizeMB": 100,
  "allowedMimeTypes": [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
  ],
  "maxFilesPerUpload": 10,
  "maxPhotos": 10,
  "minPhotos": 2,
  "maxDocuments": 20
}
```

---

## Upload Files

### Upload Document

Uploads a document file (PDF, images) to the application.

**Endpoint:** `POST /api/uploads/documents`

**Authentication:** Required (property_owner)

**Content-Type:** `multipart/form-data`

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | The file to upload |
| `documentType` | string | Type of document (see Document Types) |
| `applicationId` | uuid | (Optional) Link to specific application |

**Allowed File Types:**
- PDF: `application/pdf`
- JPEG: `image/jpeg`
- PNG: `image/png`
- WebP: `image/webp`

**Maximum File Size:** 20 MB (configurable)

**Success Response:** `201 Created`

```json
{
  "id": "uuid",
  "fileName": "ownership_deed.pdf",
  "fileUrl": "/api/documents/uuid",
  "mimeType": "application/pdf",
  "fileSize": 524288,
  "documentType": "ownership_proof",
  "uploadedAt": "2025-12-10T10:00:00Z"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `File too large` | Exceeds max size limit |
| 400 | `Invalid file type` | Unsupported MIME type |
| 400 | `No file provided` | Missing file in request |
| 413 | `Payload too large` | Request exceeds limits |

---

### Upload Photo

Uploads a property photo.

**Endpoint:** `POST /api/uploads/photos`

**Authentication:** Required (property_owner)

**Content-Type:** `multipart/form-data`

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | Image file to upload |
| `applicationId` | uuid | (Optional) Link to application |
| `caption` | string | (Optional) Photo caption |
| `category` | string | (Optional) Photo category |

**Allowed File Types:**
- JPEG: `image/jpeg`
- PNG: `image/png`
- WebP: `image/webp`

**Photo Categories:**
- `exterior` - External views
- `room` - Room photos
- `bathroom` - Bathroom photos
- `common_area` - Common areas
- `surroundings` - Surrounding views
- `other` - Other photos

**Success Response:** `201 Created`

```json
{
  "id": "uuid",
  "fileName": "exterior_view.jpg",
  "fileUrl": "/api/documents/uuid",
  "thumbnailUrl": "/api/documents/uuid/thumbnail",
  "mimeType": "image/jpeg",
  "fileSize": 1048576,
  "width": 1920,
  "height": 1080,
  "caption": "Front view of the property",
  "category": "exterior",
  "uploadedAt": "2025-12-10T10:00:00Z"
}
```

---

### Bulk Upload Photos

Upload multiple photos at once.

**Endpoint:** `POST /api/uploads/photos/bulk`

**Authentication:** Required (property_owner)

**Content-Type:** `multipart/form-data`

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| `files` | File[] | Array of image files |
| `applicationId` | uuid | Link to application |

**Maximum:** 10 files per request

**Success Response:** `201 Created`

```json
{
  "uploaded": [
    {
      "id": "uuid",
      "fileName": "photo1.jpg",
      "fileUrl": "/api/documents/uuid"
    },
    {
      "id": "uuid",
      "fileName": "photo2.jpg",
      "fileUrl": "/api/documents/uuid"
    }
  ],
  "failed": [],
  "total": 2,
  "successCount": 2,
  "failedCount": 0
}
```

---

## Download Files

### Get Document

Downloads a document file.

**Endpoint:** `GET /api/documents/:id`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | uuid | Document ID |

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `download` | boolean | Force download header |
| `inline` | boolean | Display inline in browser |

**Success Response:** `200 OK`

Returns the file as binary data with appropriate headers:

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="document.pdf"
Content-Length: 524288
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 404 | `Document not found` | Invalid ID |
| 403 | `Access denied` | Not authorized |

---

### Get Thumbnail

Gets a thumbnail version of an image.

**Endpoint:** `GET /api/documents/:id/thumbnail`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | integer | 200 | Thumbnail width |
| `height` | integer | 200 | Thumbnail height |

**Success Response:** `200 OK`

Returns resized image data.

---

### Delete Document

Removes a document from an application.

**Endpoint:** `DELETE /api/documents/:id`

**Authentication:** Required (property_owner, owner of document)

**Success Response:** `200 OK`

```json
{
  "message": "Document deleted successfully"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 404 | `Document not found` | Invalid ID |
| 403 | `Cannot delete` | Not authorized or locked |
| 400 | `Cannot delete submitted documents` | Application already submitted |

---

## Document Types

### Required Documents

| Document Type Key | Name | Required For |
|-------------------|------|--------------|
| `ownership_proof` | Ownership Proof / Revenue Papers | All categories |
| `affidavit_section29` | Affidavit (Section 29) | All categories |
| `undertaking_form_c` | Undertaking (Form-C) | All categories |
| `id_proof` | Aadhaar Card / ID Proof | All categories |

### Category-Specific Documents

| Document Type Key | Name | Required For |
|-------------------|------|--------------|
| `electricity_bill` | Commercial Electricity Bill | Gold, Diamond |
| `water_bill` | Commercial Water Bill | Gold, Diamond |

### Optional Documents

| Document Type Key | Name | Purpose |
|-------------------|------|---------|
| `fire_safety` | Fire Safety Certificate | Safety compliance |
| `building_permission` | Building Permission | Construction permit |
| `gst_certificate` | GST Registration | Tax compliance |
| `trade_license` | Trade License | Business license |
| `other` | Other Documents | Miscellaneous |

### For Existing RC Onboarding

| Document Type Key | Name | Required |
|-------------------|------|----------|
| `existing_rc` | Existing RC Certificate | Yes |
| `rc_renewal_receipt` | Last Renewal Receipt | Optional |

---

## Photo Management

### Photo Requirements

| Requirement | Value |
|-------------|-------|
| Minimum photos | 2 |
| Maximum photos | 10 |
| Minimum dimensions | 640 x 480 pixels |
| Maximum file size | 10 MB per photo |
| Allowed formats | JPEG, PNG, WebP |

### Get Application Photos

Retrieves all photos for an application.

**Endpoint:** `GET /api/applications/:id/photos`

**Authentication:** Required

**Success Response:** `200 OK`

```json
{
  "photos": [
    {
      "id": "uuid",
      "fileName": "exterior.jpg",
      "fileUrl": "/api/documents/uuid",
      "thumbnailUrl": "/api/documents/uuid/thumbnail",
      "caption": "Front view",
      "category": "exterior",
      "uploadedAt": "2025-12-10T10:00:00Z",
      "order": 1
    }
  ],
  "totalCount": 5,
  "minRequired": 2,
  "maxAllowed": 10
}
```

---

### Reorder Photos

Update the display order of photos.

**Endpoint:** `PUT /api/applications/:id/photos/order`

**Authentication:** Required (property_owner)

**Request Body:**

```json
{
  "photoOrder": [
    {"id": "uuid1", "order": 1},
    {"id": "uuid2", "order": 2},
    {"id": "uuid3", "order": 3}
  ]
}
```

**Success Response:** `200 OK`

```json
{
  "message": "Photo order updated"
}
```

---

## Storage Configuration

The system supports multiple storage backends:

| Mode | Description | Use Case |
|------|-------------|----------|
| `local` | Local filesystem storage | Development, single-server |
| `gcs` | Google Cloud Storage | Production, scalable |
| `s3` | AWS S3 Storage | Alternative cloud option |

**Note:** Storage mode is configured at server level and transparent to API consumers.

---

## Integration Notes

### For External Systems

1. **Pre-signed URLs:** For direct uploads, request pre-signed URLs to bypass server processing.

2. **Chunked Uploads:** For large files, use chunked upload for better reliability.

3. **Document Validation:** Server validates file content (not just MIME type) for security.

4. **CDN Support:** In production, file URLs may be served through CDN for performance.

---

*Document Version: 1.0*  
*Last Updated: December 2025*
