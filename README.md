# ChatTime — Ứng dụng Chat Realtime

> React + Tailwind + Node.js + Socket.io + MongoDB

---

## Công nghệ sử dụng

### Frontend (giao diện)
| **React 18** 
| **TypeScript** 
| **Vite** 
| **Tailwind CSS** 
| **Zustand** 
| **Socket.io-client** 

### Backend
| **Node.js + Express** 
| **Socket.io** 
| **MongoDB + Mongoose** 
| **JWT** 
| **Multer** 

### Desktop App
| **Tauri v2** |
| **Rust** |


Trước khi bắt đầu, cần cài các phần mềm sau:

| **Node.js** 
| **MongoDB** 


## Hướng dẫn chạy dự án

```bash
# Cài dependencies cho root (chạy script, Tauri CLI)
cd D:\Webdevelop\project-chatTime
npm install

# Cài dependencies cho client (React)
cd client
npm install

# Cài dependencies cho server (Express)
cd ../server
npm install
```

MongoDB phải đang chạy để app hoạt động. Kiểm tra:

```bash
# Kiểm tra service
Get-Service MongoDB

# Nếu không thấy, chạy thủ công
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath "C:\data\db"
```

> Nếu chưa có thư mục `C:\data\db`, tạo nó trước.


```bash
cd D:\Webdevelop\project-chatTime\client
npm run build
```

```bash
cd D:\Webdevelop\project-chatTime\server
npm run dev
```

```
http://localhost:3000
```

Bạn sẽ thấy trang **Đăng nhập** của ChatTime.

---
## Chạy ở chế độ phát triển (có hot-reload)

```bash
cd server
npm run dev

cd client
npm run dev

```
http://localhost:5173
```

---

### "Lỗi: Cannot find module '...'"
→ Chưa cài dependencies. Chạy `npm install` trong thư mục `client/` và `server/`.

### "Lỗi: MongoDB connection failed"
→ MongoDB chưa chạy. Vào Start gõ "MongoDB" → chạy MongoDB Service. Hoặc khởi động lại máy.

### "Lỗi: port 3000 already in use"
→ Có app khác đang dùng cổng 3000. Tắt nó đi, hoặc đổi PORT trong `server/.env`.

### "Trang web trắng, không có gì"
→ Server chưa chạy hoặc client chưa build. Kiểm tra terminal server.

### "Gửi ảnh xong không thấy ảnh hiện"
→ Ảnh được lưu ở `server/uploads/`. Nếu deploy lên cloud, cần dịch vụ như Cloudinary.

---

## Cấu trúc thư mục

```
chattime/
│
├── client/                          # Giao diện React
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/                # MessageBubble, MessageList, MessageInput, ...
│   │   │   ├── layout/              # Sidebar, ChatHeader
│   │   │   └── ui/                  # ImageLightbox
│   │   ├── hooks/                   # useSocket, useMediaQuery
│   │   ├── lib/                     # api.ts, socket.ts
│   │   ├── pages/                   # Login, Register, Chat, Profile
│   │   ├── stores/                  # authStore, chatStore (Zustand)
│   │   └── types/                   # TypeScript định nghĩa kiểu dữ liệu
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── server/                          # Backend Express
│   ├── src/
│   │   ├── config/                  # env.ts, db.ts
│   │   ├── controllers/             # Logic xử lý API
│   │   ├── middleware/              # Xác thực JWT
│   │   ├── models/                  # User, Room, Message (Mongoose)
│   │   ├── routes/                  # Định tuyến API
│   │   └── sockets/                 # Xử lý WebSocket realtime
│   ├── uploads/                     # Ảnh/file upload (tạo tự động)
│   ├── .env                         # Cấu hình
│   ├── package.json
│   └── tsconfig.json
│
├── src-tauri/                       # Desktop app (Tauri + Rust)
│   ├── src/                         # main.rs, lib.rs
│   ├── tauri.conf.json              # Cấu hình cửa sổ, icon
│   ├── Cargo.toml                   # Rust dependencies
│   └── icons/                       # Icon app
│
├── package.json                     # Scripts chung
├── ARCHITECTURE.md                  # Kiến trúc hệ thống
└── DEVELOPMENT_PLAN.md              # Kế hoạch phát triển
```

---

## API Endpoints

### Xác thực
| Phương thức | Đường dẫn | Mô tả |
|------------|-----------|-------|
| POST | `/api/auth/register` | Đăng ký tài khoản |
| POST | `/api/auth/login` | Đăng nhập |
| GET | `/api/auth/me` | Lấy thông tin user hiện tại |

### Người dùng
| Phương thức | Đường dẫn | Mô tả |
|------------|-----------|-------|
| GET | `/api/users/search?q=` | Tìm kiếm người dùng |
| GET | `/api/users/:id` | Xem profile |
| PUT | `/api/users/profile` | Cập nhật hồ sơ |

### Phòng chat
| Phương thức | Đường dẫn | Mô tả |
|------------|-----------|-------|
| GET | `/api/rooms` | Danh sách phòng của tôi |
| POST | `/api/rooms` | Tạo phòng (private/group) |
| GET | `/api/rooms/:id` | Chi tiết phòng |
| POST | `/api/rooms/:id/members` | Thêm thành viên (group) |

### Tin nhắn
| Phương thức | Đường dẫn | Mô tả |
|------------|-----------|-------|
| GET | `/api/rooms/:id/messages?page=1&limit=30` | Lịch sử tin nhắn (phân trang) |

### Upload
| Phương thức | Đường dẫn | Mô tả |
|------------|-----------|-------|
| POST | `/api/upload` | Upload ảnh/file |

---
