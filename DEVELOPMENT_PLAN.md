# ChatTime - Kế hoạch Phát triển (Prompt-Based Building)

> **Mục tiêu**: Xây dựng realtime chat app, sinh viên năm 3, có thể đem đi xin việc.

---

## Phase 0: Khởi tạo dự án (1 prompt)
```
Tạo 1 monorepo chứa 2 folder: client/ (React + Vite + TypeScript + Tailwind)
và server/ (Node.js + Express + TypeScript). 
- Client: Cài React 18, Vite, TypeScript, Tailwind CSS, Zustand, React Router v6, socket.io-client
- Server: Cài Express, TypeScript, socket.io, mongoose, jsonwebtoken, bcryptjs, zod, cors, dotenv
- Config tsconfig, script dev/build cho cả 2
- File .env.example ở server
```

## Phase 1: Database & Auth Backend (1-2 prompts)
```
Xây dựng REST API cho Authentication trên server/:
- Kết nối MongoDB (mongoose)
- Model: User (username, email, password hashed, displayName, avatar, isOnline, lastSeen)
- POST /api/auth/register - validation (zod), hash password, trả JWT
- POST /api/auth/login - verify password, trả JWT
- GET /api/auth/me - middleware verify JWT
- Error handling middleware
```

## Phase 2: Models & API Rooms/Messages (1 prompt)
```
Tiếp tục server/:
- Model: Room (name, type: private|group, members[], admin, lastMessage)
- Model: Message (room, sender, content, type: text|image|file|system, readBy[])
- CRUD API cho Rooms: GET /api/rooms, POST /api/rooms
- GET /api/rooms/:id/messages?page=&limit= (phân trang, tin mới nhất trước)
- POST /api/rooms/:id/members (thêm member vào group)
```

## Phase 3: Socket.io Realtime (1 prompt)
```
Xây dựng Socket.io cho server/:
- Tích hợp socket.io với Express server
- Socket auth middleware (verify JWT handshake)
- Events handler:
  + connection: cập nhật user isOnline=true, broadcast user:online
  + disconnect: cập nhật isOnline=false, broadcast user:offline
  + chat:join: join socket room theo roomId
  + chat:leave: leave socket room
  + chat:send: lưu Message vào DB, broadcast chat:message cho room
  + chat:typing: broadcast typing status
  + chat:markRead: cập nhật readBy
```

## Phase 4: UI - Layout & Auth Pages (2 prompts)
```
Xây dựng giao diện React client/:
- Prompt 4a:
  + Tạo layout: Sidebar trái (danh sách chat), Header, Main chat area
  + Tailwind config màu sắc, font
  + responsive cơ bản
  + Pages: Login, Register (form + validation + Zustand auth store)
  + Gọi API auth thật, lưu token ở localStorage, auto redirect
- Prompt 4b:
  + ProtectedRoute component
  + AuthGuard logic (nếu ko có token -> redirect login)
  + Toast notification cho login/register error
```

## Phase 5: UI - Chat Screen (2-3 prompts)
```
Xây dựng Chat UI:
- Prompt 5a:
  + ChatList component (sidebar): hiển thị danh sách room, search user
  + Zustand store cho rooms, active room
  + Gọi API GET rooms, POST rooms (tạo private chat khi click user)
- Prompt 5b:
  + ChatArea component: header (tên, avatar, online status)
  + MessageList component: render messages, tự động scroll xuống cuối
  + MessageInput component: text input, Enter gửi, nút gửi
  + Emoji picker cơ bản
- Prompt 5c:
  + Tích hợp socket.io-client
  + Gửi/nhận message realtime
  + Typing indicator
  + Online/offline status realtime
  + Đánh dấu đã đọc
```

## Phase 6: Tính năng mở rộng (2-3 prompts - optional)
```
Các tính năng tăng giá trị CV:
- Prompt 6a: Gửi ảnh/file (multer -> upload ảnh base64 hoặc cloud)
- Prompt 6b: Group chat - tạo group, thêm member, admin
- Prompt 6c: User profile page, avatar upload
- Prompt 6d: Infinite scroll message history
- Prompt 6e: Dark mode toggle (Tailwind dark mode)
- Prompt 6f: Notification sound, unread badge
```

## Phase 7: Responsive & UX (1 prompt)
```
- Mobile responsive: sidebar sẽ là drawer trên mobile
- Loading states (skeleton loading)
- Empty states (placeholder khi chưa có message)
- Error states (mất mạng, reconnect socket)
- Animation nhẹ (transition messages)
```

## Phase 8: Deploy (1-2 prompts)
```
- Frontend deploy lên Vercel
- Backend deploy lên Render (Web Service)
- MongoDB Atlas free cluster
- CORS config cho production domain
- Socket.io config cho production (cors origin)
- CI/CD cơ bản: tự động deploy khi push main
```

## Phase 9: Đóng gói Desktop (1 prompt - cuối cùng)
```
Dùng Electron hoặc Tauri để đóng gói web app thành desktop:
- Gợi ý: Dùng Tauri (nhẹ, Rust-based, file nhỏ)
- Wrap React build vào Tauri
- Cấu hình window, menu
- Build .exe/.dmg/.AppImage
```

---

## Flow xây dựng prompt cho mỗi phase

```
Bối cảnh: Dự án chatTime, công nghệ React + TypeScript + Zustand + Tailwind (client),
Node.js + Express + Socket.io + MongoDB (server).

Prompt mẫu cho Phase 3:
"Trong dự án chatTime ở server/, tôi đã có Express server, MongoDB models (User, Room, Message),
và JWT auth middleware. Hãy tích hợp Socket.io để xử lý realtime chat bao gồm:
- Xác thực socket connection bằng JWT token từ handshake
- Khi user connect: cập nhật isOnline=true, broadcast 'user:online'
- Khi disconnect: isOnline=false, broadcast 'user:offline'
- Event chat:join / chat:leave cho room
- Event chat:send: validate, lưu Message, broadcast về room
- Event chat:typing: broadcast typing status
- Tạo file riêng ở src/sockets/ cho gọn"
```

---

## Lưu ý cho AI khi build

- **Mỗi phase là 1 prompt riêng biệt** - không gộp quá nhiều việc
- **Luôn cung cấp context**: nhắc AI biết hiện tại đã có gì
- **Yêu cầu file cụ thể**: "tạo file server/src/sockets/chat.ts"
- **Nhắc coding convention**: "dùng arrow function, export named, TypeScript strict"
- **Sau mỗi prompt**: chạy thử `npm run dev` kiểm tra lỗi ngay
