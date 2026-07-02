# ChatTime - Kiến trúc & Công nghệ

## 1. Tech Stack Đề Xuất

### Frontend (React + Tailwind + Zustand)
| Công nghệ | Mục đích |
|-----------|----------|
| React 18 + Vite | UI Framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Zustand | State management |
| React Router v6 | Routing |
| Socket.io-client | Realtime |
| react-hot-toast | Notification |
| date-fns | Format thời gian |
| react-icons | Icons |

### Backend (Node.js + Express + Socket.io)
| Công nghệ | Mục đích |
|-----------|----------|
| Node.js + Express | REST API server |
| Socket.io | WebSocket realtime |
| TypeScript | Type safety |
| MongoDB + Mongoose | Database |
| JWT (jsonwebtoken) | Authentication |
| bcryptjs | Hash password |
| multer | Upload file/ảnh |
| zod | Validation |

### Deploy
| Thành phần | Platform |
|-----------|----------|
| Frontend | Vercel (free) |
| Backend | Render (free) |
| Database | MongoDB Atlas (free 512MB) |

---

## 2. Kiến trúc Tổng thể

```
┌──────────────────────────────────────────────┐
│                 Client (React)                │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Zustand  │  │ React    │  │ Socket.io │  │
│  │ Store    │  │ Router   │  │ Client    │  │
│  └──────────┘  └──────────┘  └───────────┘  │
└──────────────────────┬───────────────────────┘
                       │ HTTP + WebSocket
                       ▼
┌──────────────────────────────────────────────┐
│             Backend (Express)                 │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ REST API │  │ Socket   │  │ Auth      │  │
│  │ Routes   │  │ Gateway  │  │ Middleware│  │
│  └──────────┘  └──────────┘  └───────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │          Socket Events Handler         │  │
│  │  chat:send / chat:join / user:online  │  │
│  └────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────┐
│       MongoDB Atlas           │
│  ┌─────┐ ┌──────┐ ┌──────┐  │
│  │Users│ │Rooms │ │Msgs  │  │
│  └─────┘ └──────┘ └──────┘  │
└──────────────────────────────┘
```

---

## 3. Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  username: String,        // unique
  email: String,           // unique
  password: String,        // hashed
  displayName: String,
  avatar: String,          // URL
  bio: String,
  isOnline: Boolean,
  lastSeen: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Rooms Collection
```javascript
{
  _id: ObjectId,
  name: String,            // for group chat
  type: String,            // 'private' | 'group'
  members: [ObjectId],     // ref -> Users
  admin: ObjectId,         // ref -> User (for group)
  lastMessage: {
    content: String,
    sender: ObjectId,
    timestamp: Date
  },
  createdAt: Date
}
```

### Messages Collection
```javascript
{
  _id: ObjectId,
  room: ObjectId,          // ref -> Room
  sender: ObjectId,        // ref -> User
  content: String,
  type: String,            // 'text' | 'image' | 'file' | 'system'
  fileUrl: String,         // optional
  readBy: [ObjectId],      // list of users who read
  createdAt: Date,
  updatedAt: Date
}
```

---

## 4. Socket Events

### Client → Server
| Event | Payload | Mô tả |
|-------|---------|-------|
| chat:join | { roomId } | Join 1 phòng |
| chat:leave | { roomId } | Rời phòng |
| chat:send | { roomId, content, type } | Gửi tin nhắn |
| chat:typing | { roomId, isTyping } | Đang gõ |
| chat:markRead | { roomId, messageIds } | Đã đọc |

### Server → Client
| Event | Payload | Mô tả |
|-------|---------|-------|
| chat:message | { message } | Tin nhắn mới |
| chat:typing | { userId, isTyping } | Ai đó đang gõ |
| user:online | { userId } | User online |
| user:offline | { userId } | User offline |
| chat:read | { roomId, userId } | Đã đọc tin |

---

## 5. API Endpoints

### Auth
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Users
- `GET /api/users/search?q=` - Tìm kiếm user
- `GET /api/users/:id` - Lấy profile user
- `PUT /api/users/profile` - Cập nhật profile

### Rooms
- `GET /api/rooms` - Danh sách phòng của user
- `POST /api/rooms` - Tạo phòng (private/group)
- `GET /api/rooms/:id` - Chi tiết phòng
- `POST /api/rooms/:id/members` - Thêm member (group)

### Messages
- `GET /api/rooms/:id/messages?page=&limit=` - Lịch sử tin nhắn (infinite scroll)

---

## 6. Thư mục Backend (recommend)

```
server/
├── src/
│   ├── config/         # config env, db
│   ├── models/         # mongoose models
│   ├── routes/         # express routes
│   ├── controllers/    # business logic
│   ├── middleware/     # auth, validation
│   ├── sockets/        # socket.io handlers
│   ├── utils/          # helpers
│   └── index.ts        # entry point
├── package.json
└── tsconfig.json
```

## 7. Thư mục Frontend

```
client/
├── src/
│   ├── components/     # shared components
│   │   ├── ui/         # button, input, modal...
│   │   ├── chat/       # message, chat list...
│   │   └── layout/     # sidebar, header...
│   ├── pages/          # route pages
│   ├── stores/         # zustand stores
│   ├── hooks/          # custom hooks
│   ├── lib/            # socket, api clients
│   ├── types/          # TypeScript types
│   ├── assets/         # images, icons
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```
