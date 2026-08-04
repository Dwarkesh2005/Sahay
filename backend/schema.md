# Sahay Database Schema

## Project Overview

Sahay is a community support platform that connects **migrants**, **NGOs**, **volunteers**, and **administrators**. The database is designed to support:

- User Authentication
- NGO Registration & Verification
- Help Request Management
- NGO/Volunteer Responses
- Chat System
- Reporting System

---

# Database Entities

## 1. Cities

Stores all supported cities.

| Column | Type | Constraints |
|---------|------|-------------|
| city_id | SERIAL | Primary Key |
| city_name | VARCHAR(100) | NOT NULL |
| district | VARCHAR(100) | NOT NULL |
| state | VARCHAR(100) | NOT NULL |

**Unique Constraint**

(city_name, district, state)

---

## 2. Users

Stores all platform users.

Supported Roles:

- MIGRANT
- VOLUNTEER
- NGO
- ADMIN

| Column | Type |
|---------|------|
| user_id | SERIAL (PK) |
| full_name | VARCHAR(100) |
| email | VARCHAR(255) UNIQUE |
| phone_number | VARCHAR(15) UNIQUE |
| password_hash | TEXT |
| role | user_role |
| city_id | FK → cities.city_id |
| address | TEXT |
| latitude | DECIMAL(10,8) |
| longitude | DECIMAL(11,8) |
| profile_photo | TEXT |
| is_active | BOOLEAN |
| is_verified | BOOLEAN |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

---

## 3. NGOs

Stores organization-specific information.

Every NGO must have one corresponding user account.

| Column | Type |
|---------|------|
| ngo_id | SERIAL (PK) |
| user_id | FK → users.user_id |
| ngo_name | VARCHAR(255) |
| registration_number | VARCHAR(100) UNIQUE |
| ngo_darpan_id | VARCHAR(100) UNIQUE |
| contact_person | VARCHAR(100) |
| phone_number | VARCHAR(15) |
| email | VARCHAR(255) |
| website | TEXT |
| city_id | FK → cities.city_id |
| address | TEXT |
| latitude | DECIMAL(10,8) |
| longitude | DECIMAL(11,8) |
| verification_status | verification_status |
| description | TEXT |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

Relationship:

One User → One NGO

---

## 4. NGO Services

Stores all services provided by NGOs.

| Column | Type |
|---------|------|
| service_id | SERIAL (PK) |
| ngo_id | FK → ngos.ngo_id |
| service | service_type |

Available Services:

- FOOD
- SHELTER
- MEDICAL
- EMPLOYMENT
- EDUCATION
- LEGAL
- GUIDANCE
- OTHER

Unique Constraint:

(ngo_id, service)

Relationship:

One NGO → Many Services

---

## 5. Help Requests

Stores requests created by migrants.

| Column | Type |
|---------|------|
| request_id | SERIAL (PK) |
| user_id | FK → users.user_id |
| request_type | request_type |
| title | VARCHAR(150) |
| description | TEXT |
| city_id | FK → cities.city_id |
| latitude | DECIMAL(10,8) |
| longitude | DECIMAL(11,8) |
| status | request_status |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

Request Types

- FOOD
- SHELTER
- MEDICAL
- EMPLOYMENT
- GUIDANCE

Status

- PENDING
- ACCEPTED
- COMPLETED
- CANCELLED

Relationship:

One User → Many Help Requests

---

## 6. Request Responses

Stores responses from NGOs or volunteers.

| Column | Type |
|---------|------|
| response_id | SERIAL (PK) |
| request_id | FK → help_requests.request_id |
| responder_id | FK → users.user_id |
| response_message | TEXT |
| response_time | TIMESTAMP |
| status | response_status |

Status

- ACCEPTED
- REJECTED
- COMPLETED

Unique Constraint

(request_id, responder_id)

Relationship

One Help Request → Many Responses

---

## 7. Chats

Created after a migrant accepts a response.

| Column | Type |
|---------|------|
| chat_id | SERIAL (PK) |
| request_id | FK → help_requests.request_id |
| responder_id | FK → users.user_id |
| created_at | TIMESTAMP |

Unique Constraint

(request_id, responder_id)

Relationship

One Accepted Response → One Chat

---

## 8. Messages

Stores chat messages.

| Column | Type |
|---------|------|
| message_id | SERIAL (PK) |
| chat_id | FK → chats.chat_id |
| sender_id | FK → users.user_id |
| message | TEXT |
| sent_at | TIMESTAMP |
| is_read | BOOLEAN |

Relationship

One Chat → Many Messages

---

## 9. NGO Verification

Stores NGO verification records.

| Column | Type |
|---------|------|
| verification_id | SERIAL (PK) |
| ngo_id | FK → ngos.ngo_id |
| verification_method | VARCHAR(100) |
| verified_by | VARCHAR(100) |
| verification_date | DATE |
| remarks | TEXT |

Relationship

One NGO → Many Verification Records

---

## 10. Reports

Stores reports submitted against NGOs.

| Column | Type |
|---------|------|
| report_id | SERIAL (PK) |
| ngo_id | FK → ngos.ngo_id |
| user_id | FK → users.user_id |
| reason | TEXT |
| status | report_status |
| created_at | TIMESTAMP |

Report Status

- PENDING
- REVIEWED
- RESOLVED

Relationship

- One User → Many Reports
- One NGO → Many Reports

---

# Entity Relationship Overview

```
Cities
   │
   ├──────────────┐
   │              │
   ▼              ▼
Users         NGOs
 │              │
 │              ▼
 │        NGO Services
 │
 ▼
Help Requests
 │
 ├──────────────┐
 ▼              ▼
Request      Chats
Responses       │
 │              ▼
 └──────────► Messages

NGOs
 │
 ▼
NGO Verification

Users
 │
 ▼
Reports
 ▲
 │
NGOs
```

---

# Authentication Flow

## Signup

1. User registers.
2. Password is hashed.
3. User is stored in the `users` table.
4. If the role is **NGO**, additional NGO information is stored in the `ngos` table.

---

## Login

1. User enters email and password.
2. User is searched by email.
3. Password hash is verified.
4. Backend generates a JWT.
5. User is redirected based on role.

---

# Database Features

- PostgreSQL ENUM types
- Primary Keys
- Foreign Keys
- One-to-One Relationships
- One-to-Many Relationships
- Unique Constraints
- Cascading Deletes
- Normalized Schema (3NF)
- Timestamp Tracking
- User Role Management
- NGO Verification Workflow
- Chat & Messaging Support
- Help Request Management
- Reporting System