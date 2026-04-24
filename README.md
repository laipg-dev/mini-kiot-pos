# Mini Kiot POS v8

Ứng dụng Web tĩnh quản lý bán hàng phong cách KiotViet, dùng HTML/CSS/JS thuần, Tailwind CSS CDN, Chart.js, SheetJS và Supabase Database/Storage.

## Điểm mới trong v5

- Bỏ hoàn toàn trường **Loại sản phẩm** để tránh trùng với **Danh mục**.
- Tách **Danh mục** thành một panel riêng ngang cấp với Báo cáo, Hàng hóa, POS, Đơn hàng và Lịch sử.
- Không tự tạo danh mục **Khác** nữa. Sản phẩm có thể để trống danh mục và sẽ hiển thị là **Chưa phân loại**.
- Sidebar desktop được tách riêng khỏi vùng nội dung. Khi cuộn hoặc rê chuột trong Báo cáo, cột trái không bị cuộn theo.
- Form Thêm hàng hóa giữ cấu trúc đơn giản: tên, mã sản phẩm tự động, danh mục, SKU, mô tả, ảnh, giá vốn, giá bán, tồn kho.
- Import/export Excel hàng hóa đã bỏ cột `product_type`.

## Cấu trúc thư mục

```txt
mini-kiot-pos-v8/
├── index.html
├── js/
│   ├── api.js
│   ├── app.js
│   ├── render.js
│   └── state.js
├── sql/
│   └── schema.sql
├── templates/
│   ├── product-import-template.xlsx
│   └── order-import-template.xlsx
└── assets/
```

## Cách chạy

1. Tạo project Supabase.
2. Mở Supabase SQL Editor.
3. Chạy toàn bộ nội dung trong `sql/schema.sql`.
4. Deploy thư mục này lên GitHub Pages hoặc mở `index.html` bằng local static server.
5. Vào **Cài đặt**.
6. Nhập `SUPABASE_URL` và `SUPABASE_ANON_KEY`.
7. Tạo danh mục trong panel **Danh mục** nếu cần.
8. Thêm hàng hóa hoặc import từ Excel.

## Mẫu import hàng hóa

File mẫu nằm tại:

```txt
templates/product-import-template.xlsx
```

Các cột:

```txt
category_name
product_name
product_code
sku
description
cost_price
sale_price
stock_qty
image_url
```

Ghi chú:

- `category_name` có thể để trống.
- Nếu `category_name` chưa tồn tại, hệ thống sẽ tự tạo danh mục đó khi import.
- Nếu `product_code` bỏ trống, hệ thống tự tạo mã ngắn từ tên sản phẩm.
- Mỗi dòng hàng hóa tạo một sản phẩm với một tồn kho mặc định.

## Mẫu import đơn hàng

File mẫu nằm tại:

```txt
templates/order-import-template.xlsx
```

Các cột chính:

```txt
order_code
created_at
customer_name
customer_phone
customer_address
discount
product_code
sku
product_name
variant_label
quantity
sale_price
cost_price
```

## Lưu ý bảo mật

- Chỉ dùng Supabase anon public key trên frontend.
- Không đưa service role key vào GitHub Pages.
- Bật RLS và chỉnh policy phù hợp trước khi dùng thật.
- RPC trong `schema.sql` xử lý tạo đơn, import đơn, hủy đơn và trả hàng theo transaction để đảm bảo tồn kho nhất quán.

## Cập nhật V6

Bản V6 tập trung sửa lỗi thao tác và hoàn thiện CRUD:

- Sửa lỗi `generateProductCode is not defined` khi bấm nút Tạo mã sản phẩm.
- Danh mục được tách thành panel CRUD đầy đủ: thêm, sửa, xóa.
- Hàng hóa có thao tác sửa và xóa mềm ngay trong bảng hàng hóa.
- POS bổ sung trường khách hàng và số điện thoại, giỏ hàng vẫn hỗ trợ sửa số lượng và xóa dòng hàng.
- Lịch sử hoạt động hiển thị chi tiết hơn, bao gồm thời gian, tên action, mã tham chiếu, giá trị, dữ liệu hàng hóa/đơn hàng/danh mục trước và sau thao tác.
- Hủy đơn và trả hàng ghi chi tiết các dòng sản phẩm được hoàn kho.
- Export lịch sử có thêm cột `detail_json` để kiểm tra lại metadata đầy đủ.

Nếu đang dùng database bản cũ, hãy chạy lại `sql/schema.sql` trong Supabase SQL Editor để cập nhật RPC ghi lịch sử chi tiết hơn.

## Cập nhật v7

- Sửa lại màn Danh mục thành danh sách card rõ ràng, không còn bảng bị lệch hoặc bị cuộn ngang khó nhìn.
- Danh mục hỗ trợ CRUD đầy đủ: thêm, sửa, xóa.
- Đơn hàng thay nút Hủy bằng nút Sửa. Trả hàng vẫn giữ riêng để hoàn tồn kho.
- Sửa đơn hàng cho phép cập nhật tên khách, số điện thoại và giảm giá. Chi tiết hàng bán được giữ nguyên để bảo toàn lịch sử kho.
- Lịch sử hoạt động được thiết kế lại theo từng panel action riêng, hiển thị thời gian, mã tham chiếu, giá trị và chi tiết hàng nhập, hàng bán, sửa xóa.
- Thêm action order_updated để ghi lại lịch sử sửa đơn hàng.


## Cập nhật v8

- Sửa bộ lọc Báo cáo: các mốc Hôm nay, Tháng này, Năm nay và Tất cả chạy trực tiếp ngay khi chọn.
- Thêm lựa chọn **Tùy chọn** trong Báo cáo. Chỉ khi chọn Tùy chọn thì hai ô chọn ngày mới hiển thị.
- Thêm trường **Địa chỉ** cho đơn hàng, dùng tương tự tên khách hàng và số điện thoại.
- POS có ô nhập địa chỉ khi tạo đơn.
- Modal Sửa đơn hàng cho phép cập nhật địa chỉ.
- Danh sách đơn hàng, lịch sử hoạt động, hóa đơn in và export Excel đơn hàng đều hiển thị địa chỉ nếu có.
- Mẫu import đơn hàng đã thêm cột `customer_address`.

Nếu đang dùng database bản cũ, hãy chạy lại `sql/schema.sql` để thêm cột `orders.customer_address` và cập nhật RPC tạo đơn.
