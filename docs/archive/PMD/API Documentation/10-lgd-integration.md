# LGD (Local Government Directory) Integration API

This document covers all endpoints related to Local Government Directory integration for location data management.

---

## Table of Contents

1. [Overview](#overview)
2. [Districts](#districts)
3. [Tehsils](#tehsils)
4. [Blocks](#blocks)
5. [Gram Panchayats](#gram-panchayats)
6. [Urban Bodies](#urban-bodies)
7. [LGD Import](#lgd-import)

---

## Overview

The HP Tourism eServices platform integrates with the **Local Government Directory (LGD)** maintained by the Ministry of Panchayati Raj, Government of India. This ensures accurate and standardized location data across the application.

### LGD Data Hierarchy

```
State (Himachal Pradesh)
└── District (e.g., Shimla)
    ├── Tehsil/Sub-Division
    │   ├── Block
    │   │   └── Gram Panchayat (Rural)
    │   └── Urban Body (Urban areas)
```

### Data Sources

| Entity | Source | Update Frequency |
|--------|--------|------------------|
| Districts | LGD India | On-demand import |
| Tehsils | LGD India | On-demand import |
| Blocks | LGD India | On-demand import |
| Gram Panchayats | LGD India | On-demand import |
| Urban Bodies | LGD India | On-demand import |

---

## Districts

### Get All Districts

Returns all districts in Himachal Pradesh.

**Endpoint:** `GET /api/lgd/districts`

**Authentication:** None required (Public API)

**Success Response:** `200 OK`

```json
{
  "districts": [
    {
      "lgdCode": "18",
      "code": "SML",
      "name": "Shimla",
      "nameLocal": "शिमला",
      "stateCode": "2",
      "isActive": true
    },
    {
      "lgdCode": "19",
      "code": "KLU",
      "name": "Kullu",
      "nameLocal": "कुल्लू",
      "stateCode": "2",
      "isActive": true
    }
  ],
  "totalCount": 12
}
```

---

### Get District by Code

Returns a specific district.

**Endpoint:** `GET /api/lgd/districts/:code`

**Authentication:** None required

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | District code (e.g., SML) |

**Success Response:** `200 OK`

```json
{
  "lgdCode": "18",
  "code": "SML",
  "name": "Shimla",
  "nameLocal": "शिमला",
  "stateCode": "2",
  "isActive": true,
  "tehsilCount": 8,
  "blockCount": 12,
  "gramPanchayatCount": 356,
  "urbanBodyCount": 4
}
```

---

## Tehsils

### Get Tehsils by District

Returns all tehsils in a district.

**Endpoint:** `GET /api/lgd/districts/:districtCode/tehsils`

**Authentication:** None required

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `districtCode` | string | District code |

**Success Response:** `200 OK`

```json
{
  "districtCode": "SML",
  "districtName": "Shimla",
  "tehsils": [
    {
      "lgdCode": "1801",
      "code": "SML-SMU",
      "name": "Shimla Urban",
      "nameLocal": "शिमला शहरी",
      "isActive": true
    },
    {
      "lgdCode": "1802",
      "code": "SML-THG",
      "name": "Theog",
      "nameLocal": "थियोग",
      "isActive": true
    }
  ],
  "totalCount": 8
}
```

---

### Get All Tehsils

Returns all tehsils (for dropdowns).

**Endpoint:** `GET /api/lgd/tehsils`

**Authentication:** None required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `district` | string | Filter by district code |

---

## Blocks

### Get Blocks by District

Returns all blocks in a district.

**Endpoint:** `GET /api/lgd/districts/:districtCode/blocks`

**Authentication:** None required

**Success Response:** `200 OK`

```json
{
  "districtCode": "SML",
  "districtName": "Shimla",
  "blocks": [
    {
      "lgdCode": "180101",
      "code": "SML-THG-01",
      "name": "Theog",
      "tehsilCode": "SML-THG",
      "tehsilName": "Theog",
      "isActive": true
    }
  ],
  "totalCount": 12
}
```

---

### Get Blocks by Tehsil

Returns all blocks in a tehsil.

**Endpoint:** `GET /api/lgd/tehsils/:tehsilCode/blocks`

**Authentication:** None required

---

## Gram Panchayats

### Get Gram Panchayats by Block

Returns all gram panchayats in a block.

**Endpoint:** `GET /api/lgd/blocks/:blockCode/gram-panchayats`

**Authentication:** None required

**Success Response:** `200 OK`

```json
{
  "blockCode": "SML-THG-01",
  "blockName": "Theog",
  "gramPanchayats": [
    {
      "lgdCode": "18010101",
      "code": "SML-THG-01-001",
      "name": "Khatnol",
      "nameLocal": "खटनोल",
      "isActive": true
    },
    {
      "lgdCode": "18010102",
      "code": "SML-THG-01-002",
      "name": "Matiana",
      "nameLocal": "मटियाणा",
      "isActive": true
    }
  ],
  "totalCount": 35
}
```

---

### Search Gram Panchayats

Search gram panchayats by name.

**Endpoint:** `GET /api/lgd/gram-panchayats/search`

**Authentication:** None required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query |
| `district` | string | Filter by district |
| `limit` | integer | Max results (default: 20) |

**Success Response:** `200 OK`

```json
{
  "query": "khatn",
  "results": [
    {
      "lgdCode": "18010101",
      "name": "Khatnol",
      "fullPath": "Shimla > Theog > Theog Block > Khatnol"
    }
  ],
  "totalCount": 1
}
```

---

## Urban Bodies

### Get Urban Bodies by District

Returns all urban bodies (municipal corporations, councils, nagar panchayats) in a district.

**Endpoint:** `GET /api/lgd/districts/:districtCode/urban-bodies`

**Authentication:** None required

**Success Response:** `200 OK`

```json
{
  "districtCode": "SML",
  "districtName": "Shimla",
  "urbanBodies": [
    {
      "lgdCode": "180201",
      "code": "SML-MC-01",
      "name": "Shimla Municipal Corporation",
      "type": "municipal_corporation",
      "typeLabel": "Municipal Corporation",
      "isActive": true
    },
    {
      "lgdCode": "180202",
      "code": "SML-NP-01",
      "name": "Narkanda Nagar Panchayat",
      "type": "nagar_panchayat",
      "typeLabel": "Nagar Panchayat",
      "isActive": true
    }
  ],
  "totalCount": 4
}
```

### Urban Body Types

| Type | Label |
|------|-------|
| `municipal_corporation` | Municipal Corporation |
| `municipal_council` | Municipal Council |
| `nagar_panchayat` | Nagar Panchayat |

---

## LGD Import

### Import LGD Data

Imports/updates LGD data from source.

**Endpoint:** `POST /api/admin/lgd/import`

**Authentication:** Required (admin, super_admin)

**Request Body:**

```json
{
  "entities": ["districts", "tehsils", "blocks", "gram_panchayats", "urban_bodies"],
  "mode": "update",
  "source": "lgd_api"
}
```

**Import Modes:**

| Mode | Description |
|------|-------------|
| `update` | Update existing, add new |
| `replace` | Replace all existing data |
| `add_only` | Only add new, skip existing |

**Success Response:** `200 OK`

```json
{
  "status": "completed",
  "results": {
    "districts": {"added": 0, "updated": 12, "errors": 0},
    "tehsils": {"added": 5, "updated": 78, "errors": 0},
    "blocks": {"added": 2, "updated": 98, "errors": 0},
    "gram_panchayats": {"added": 15, "updated": 3200, "errors": 3},
    "urban_bodies": {"added": 0, "updated": 45, "errors": 0}
  },
  "importedAt": "2025-12-11T10:00:00Z",
  "duration": "45.2s"
}
```

---

### Get Import Status

Gets the status of an ongoing import.

**Endpoint:** `GET /api/admin/lgd/import/status`

**Authentication:** Required (admin, super_admin)

**Success Response:** `200 OK`

```json
{
  "status": "in_progress",
  "currentEntity": "gram_panchayats",
  "progress": {
    "total": 3500,
    "processed": 2100,
    "percentage": 60
  },
  "startedAt": "2025-12-11T10:00:00Z"
}
```

---

### Get Import History

Gets history of LGD imports.

**Endpoint:** `GET /api/admin/lgd/imports`

**Authentication:** Required (admin, super_admin)

**Success Response:** `200 OK`

```json
{
  "imports": [
    {
      "id": "uuid",
      "startedAt": "2025-12-11T10:00:00Z",
      "completedAt": "2025-12-11T10:00:45Z",
      "status": "completed",
      "recordsProcessed": 3500,
      "errors": 3,
      "triggeredBy": "Admin Name"
    }
  ]
}
```

---

## Location Lookup

### Get Location Details

Gets complete location hierarchy details.

**Endpoint:** `GET /api/lgd/location`

**Authentication:** None required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `pincode` | string | PIN code |
| `gramPanchayat` | string | GP code |
| `urbanBody` | string | Urban body code |

**Success Response:** `200 OK`

```json
{
  "found": true,
  "location": {
    "state": "Himachal Pradesh",
    "district": {
      "code": "SML",
      "name": "Shimla"
    },
    "tehsil": {
      "code": "SML-THG",
      "name": "Theog"
    },
    "block": {
      "code": "SML-THG-01",
      "name": "Theog"
    },
    "gramPanchayat": {
      "code": "SML-THG-01-001",
      "name": "Khatnol"
    },
    "pincode": "171202",
    "type": "rural"
  }
}
```

---

### Validate Location

Validates location data consistency.

**Endpoint:** `POST /api/lgd/validate`

**Authentication:** None required

**Request Body:**

```json
{
  "district": "Shimla",
  "tehsil": "Theog",
  "block": "Theog",
  "gramPanchayat": "Khatnol"
}
```

**Success Response:** `200 OK`

```json
{
  "valid": true,
  "normalized": {
    "district": {"code": "SML", "name": "Shimla"},
    "tehsil": {"code": "SML-THG", "name": "Theog"},
    "block": {"code": "SML-THG-01", "name": "Theog"},
    "gramPanchayat": {"code": "SML-THG-01-001", "name": "Khatnol"}
  }
}
```

**Invalid Response:**

```json
{
  "valid": false,
  "errors": [
    {"field": "gramPanchayat", "message": "Gram Panchayat 'XYZ' not found in block 'Theog'"}
  ],
  "suggestions": [
    {"field": "gramPanchayat", "values": ["Khatnol", "Matiana", "..."]}
  ]
}
```

---

## Integration Notes

### For External Systems

1. **Caching:** LGD data is relatively static. Cache responses for 24 hours.

2. **Bulk Download:** For offline use, use the export endpoints.

3. **Updates:** Subscribe to import notifications for data updates.

4. **LGD Codes:** Use official LGD codes for government system integrations.

### HP District Codes

| LGD Code | Short Code | District Name |
|----------|------------|---------------|
| 18 | SML | Shimla |
| 19 | KLU | Kullu |
| 20 | KGR | Kangra |
| 21 | MND | Mandi |
| 22 | HMR | Hamirpur |
| 23 | SLN | Solan |
| 24 | UNA | Una |
| 25 | BLR | Bilaspur |
| 26 | CBA | Chamba |
| 27 | SRM | Sirmaur |
| 28 | KNR | Kinnaur |
| 29 | LHL | Lahaul & Spiti |

---

*Document Version: 1.0*  
*Last Updated: December 2025*
