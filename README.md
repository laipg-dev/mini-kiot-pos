# Sales Management App

Ứng dụng quản lý bán hàng dạng web tĩnh, dùng HTML, Tailwind CSS, JavaScript thuần và Supabase.

Ứng dụng phù hợp cho cửa hàng nhỏ, bán hàng đa dạng sản phẩm, quản lý hàng hóa, danh mục, đơn hàng, nhập xuất Excel, lịch sử hoạt động và báo cáo doanh thu.

---

## 1. Tổng quan hệ thống

### 1.1. Mục tiêu

Ứng dụng giúp người dùng quản lý các nghiệp vụ bán hàng cơ bản:

- Quản lý danh mục sản phẩm.
- Quản lý hàng hóa.
- Quản lý tồn kho, giá vốn, giá bán.
- Tạo đơn bán hàng.
- Trả hàng và hoàn tồn kho.
- Import và export dữ liệu bằng Excel.
- Xem lịch sử hoạt động chi tiết.
- Xem báo cáo doanh thu, chi phí, lợi nhuận.
- Triển khai dễ dàng trên GitHub Pages.

### 1.2. Kiến trúc

Ứng dụng là web tĩnh, không cần backend riêng.

Dữ liệu được lưu trên Supabase:

- Supabase Database dùng để lưu danh mục, hàng hóa, đơn hàng, chi tiết đơn hàng và lịch sử.
- Supabase Storage dùng để lưu ảnh sản phẩm.
- Supabase RPC dùng cho các thao tác cần đảm bảo dữ liệu như tạo đơn, trừ tồn kho, trả hàng và hoàn tồn kho.

Người dùng nhập thông tin Supabase trong màn hình Cài đặt:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Thông tin này được lưu trong `localStorage` trên trình duyệt.

---

## 2. Cấu trúc thư mục

```txt
mini-kiot-pos/
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
├── assets/
└── README.md
```

### 2.1. Giải thích từng file

#### `index.html`

File giao diện chính của ứng dụng.

File này chứa:

- Layout tổng thể.
- Sidebar desktop.
- Bottom navigation trên mobile.
- Các panel chính như Báo cáo, Danh mục, Hàng hóa, Bán hàng, Đơn hàng, Lịch sử, Cài đặt.
- Các modal thêm, sửa hàng hóa, sửa đơn hàng, in hóa đơn.

#### `js/api.js`

File xử lý kết nối Supabase.

File này phụ trách:

- Lưu và đọc cấu hình Supabase.
- Gọi database.
- Upload ảnh lên Supabase Storage.
- Tạo đơn hàng.
- Trừ tồn kho.
- Trả hàng và hoàn tồn kho.
- Import dữ liệu.
- Export dữ liệu.
- Ghi lịch sử hoạt động.
- Lấy dữ liệu báo cáo.

#### `js/app.js`

File điều khiển chính của ứng dụng.

File này phụ trách:

- Gắn sự kiện cho các nút bấm.
- Điều hướng giữa các panel.
- Xử lý submit form.
- Gọi API.
- Cập nhật state.
- Gọi render để hiển thị lại giao diện.

#### `js/render.js`

File render giao diện.

File này phụ trách:

- Hiển thị danh sách danh mục.
- Hiển thị danh sách hàng hóa.
- Hiển thị danh sách sản phẩm trong POS.
- Hiển thị giỏ hàng.
- Hiển thị danh sách đơn hàng.
- Hiển thị lịch sử hoạt động.
- Hiển thị báo cáo và biểu đồ.

#### `js/state.js`

File quản lý trạng thái frontend.

File này lưu các dữ liệu đang dùng trên trình duyệt như:

- Danh sách sản phẩm.
- Danh sách danh mục.
- Giỏ hàng.
- Bộ lọc hiện tại.
- Dữ liệu báo cáo.
- Danh sách đơn hàng.
- Danh sách lịch sử.

#### `sql/schema.sql`

File SQL để khởi tạo database Supabase.

File này tạo:

- Bảng danh mục.
- Bảng sản phẩm.
- Bảng biến thể mặc định của sản phẩm.
- Bảng đơn hàng.
- Bảng chi tiết đơn hàng.
- Bảng lịch sử hoạt động.
- Các hàm RPC cần thiết.
- Các policy bảo mật cơ bản.

#### `templates/product-import-template.xlsx`

File Excel mẫu để import hàng hóa.

#### `templates/order-import-template.xlsx`

File Excel mẫu để import đơn hàng.

---

## 3. Cài đặt ban đầu

### 3.1. Tạo project Supabase

1. Truy cập Supabase.
2. Tạo project mới.
3. Vào phần SQL Editor.
4. Mở file `sql/schema.sql`.
5. Copy toàn bộ nội dung SQL.
6. Chạy SQL trong Supabase.

Sau khi chạy xong, database sẽ có đủ bảng và hàm cần thiết.

### 3.2. Tạo Storage Bucket cho ảnh sản phẩm

Trong Supabase:

1. Vào Storage.
2. Tạo bucket tên:

```txt
product-images
```

3. Đặt bucket ở chế độ public nếu muốn ảnh hiển thị trực tiếp bằng public URL.
4. Kiểm tra policy upload nếu không upload được ảnh.

### 3.3. Lấy Supabase URL và Anon Key

Trong Supabase:

1. Vào Project Settings.
2. Chọn API.
3. Copy:

```txt
Project URL
anon public key
```

Không dùng `service_role key` trong frontend.

### 3.4. Mở ứng dụng

Có thể mở trực tiếp bằng file:

```txt
index.html
```

Hoặc deploy lên GitHub Pages.

### 3.5. Cấu hình trong ứng dụng

1. Mở ứng dụng.
2. Vào panel Cài đặt.
3. Nhập `SUPABASE_URL`.
4. Nhập `SUPABASE_ANON_KEY`.
5. Bấm Lưu cấu hình.
6. Bấm Làm mới dữ liệu.

---

## 4. Hướng dẫn sử dụng từng chức năng

## 4.1. Panel Báo cáo

Panel Báo cáo dùng để xem tổng quan tình hình kinh doanh.

### Các chỉ số chính

#### Doanh thu

Tổng tiền bán hàng từ các đơn đã hoàn thành.

#### Tiền vốn

Tổng giá vốn của các sản phẩm đã bán.

#### Lợi nhuận gộp

Công thức:

```txt
Lợi nhuận gộp = Doanh thu - Tiền vốn
```

#### Số đơn

Tổng số đơn hàng trong khoảng thời gian đang lọc.

### Bộ lọc thời gian

Có các lựa chọn:

- Hôm nay.
- Tháng này.
- Năm nay.
- Tất cả.
- Tùy chọn.

#### Hôm nay

Hiển thị dữ liệu của ngày hiện tại.

#### Tháng này

Hiển thị dữ liệu từ ngày đầu tháng đến ngày hiện tại.

#### Năm nay

Hiển thị dữ liệu từ ngày đầu năm đến ngày hiện tại.

#### Tất cả

Hiển thị toàn bộ dữ liệu.

#### Tùy chọn

Khi chọn Tùy chọn, ứng dụng sẽ hiện ô chọn ngày bắt đầu và ngày kết thúc.

Cách dùng:

1. Chọn Tùy chọn.
2. Chọn ngày bắt đầu.
3. Chọn ngày kết thúc.
4. Báo cáo sẽ cập nhật theo khoảng ngày đã chọn.

### Biểu đồ doanh thu

Biểu đồ thể hiện doanh thu và lợi nhuận theo thời gian.

Dữ liệu biểu đồ thay đổi theo bộ lọc thời gian.

### Top sản phẩm bán chạy

Hiển thị các sản phẩm có số lượng bán ra cao nhất.

Thông tin thường gồm:

- Tên sản phẩm.
- Số lượng đã bán.
- Doanh thu.
- Lợi nhuận nếu có dữ liệu giá vốn.

### Hàng sắp hết

Hiển thị các sản phẩm có tồn kho thấp.

Mục này giúp người dùng biết sản phẩm nào cần nhập thêm.

---

## 4.2. Panel Danh mục

Panel Danh mục dùng để quản lý nhóm sản phẩm.

Ví dụ danh mục:

- Áo thun.
- Đồ uống.
- Mỹ phẩm.
- Phụ kiện.
- Văn phòng phẩm.

Danh mục giúp:

- Phân loại hàng hóa.
- Lọc sản phẩm nhanh hơn.
- Báo cáo theo nhóm sản phẩm dễ hơn.
- Chuẩn bị cho việc mở rộng chi tiết sản phẩm sau này.

### Thêm danh mục

Cách thực hiện:

1. Vào panel Danh mục.
2. Nhập tên danh mục.
3. Bấm Thêm danh mục.

Sau khi thêm thành công, danh mục sẽ xuất hiện trong danh sách.

### Sửa danh mục

Cách thực hiện:

1. Tìm danh mục cần sửa.
2. Bấm Sửa.
3. Nhập tên mới.
4. Xác nhận lưu.

Ứng dụng sẽ cập nhật tên danh mục trên các sản phẩm liên quan.

### Xóa danh mục

Cách thực hiện:

1. Tìm danh mục cần xóa.
2. Bấm Xóa.
3. Xác nhận thao tác.

Lưu ý:

- Nếu danh mục đang được gắn với sản phẩm, hệ thống có thể chặn xóa hoặc chuyển sản phẩm về trạng thái chưa phân loại tùy theo logic hiện tại.
- Nên kiểm tra số sản phẩm đang dùng danh mục trước khi xóa.

### Danh mục chưa phân loại

Nếu sản phẩm không được chọn danh mục, ứng dụng sẽ hiển thị là:

```txt
Chưa phân loại
```

Đây không phải là một danh mục bắt buộc trong database. Đây chỉ là cách hiển thị để người dùng dễ hiểu.

---

## 4.3. Panel Hàng hóa

Panel Hàng hóa dùng để quản lý sản phẩm và tồn kho.

### Thông tin sản phẩm

Mỗi sản phẩm có các trường chính:

#### Tên sản phẩm

Tên hiển thị của sản phẩm.

Ví dụ:

```txt
Áo thun basic
Cà phê sữa đá
Tai nghe Bluetooth
```

#### Mã sản phẩm

Mã sản phẩm được tự động tạo từ tên sản phẩm.

Ví dụ:

```txt
Tên sản phẩm: Áo thun basic
Mã sản phẩm: ATB001
```

Mã này giúp tìm kiếm, import đơn hàng và đối soát dữ liệu.

#### Danh mục

Nhóm sản phẩm dùng để phân loại.

Có thể để trống nếu chưa cần phân loại.

#### SKU

Mã nội bộ hoặc mã kho.

SKU có thể do người dùng tự nhập.

Ví dụ:

```txt
SKU-AO-001
CF-SUA-250ML
```

#### Mô tả

Thông tin mô tả ngắn về sản phẩm.

Ví dụ:

```txt
Áo thun cotton, form regular.
Ly cà phê sữa đá dung tích 500ml.
```

#### Ảnh sản phẩm

Có thể chọn ảnh từ máy tính hoặc điện thoại.

Ảnh sẽ được upload lên Supabase Storage.

#### Giá vốn

Chi phí nhập sản phẩm.

Dùng để tính lợi nhuận.

#### Giá bán

Giá bán cho khách hàng.

#### Tồn kho

Số lượng hiện có trong kho.

### Thêm hàng hóa

Cách thực hiện:

1. Vào panel Hàng hóa.
2. Bấm Thêm hàng hóa.
3. Nhập tên sản phẩm.
4. Mã sản phẩm sẽ tự tạo.
5. Chọn danh mục nếu có.
6. Nhập SKU nếu cần.
7. Nhập mô tả nếu cần.
8. Chọn ảnh sản phẩm nếu có.
9. Nhập giá vốn.
10. Nhập giá bán.
11. Nhập tồn kho.
12. Bấm Lưu.

Sau khi lưu thành công, sản phẩm sẽ xuất hiện trong danh sách hàng hóa và POS.

### Sửa hàng hóa

Cách thực hiện:

1. Tìm sản phẩm cần sửa.
2. Bấm Sửa.
3. Cập nhật thông tin.
4. Bấm Lưu.

Có thể sửa:

- Tên sản phẩm.
- Mã sản phẩm.
- Danh mục.
- SKU.
- Mô tả.
- Ảnh.
- Giá vốn.
- Giá bán.
- Tồn kho.

Sau khi sửa, hệ thống ghi lại lịch sử thay đổi.

### Xóa hàng hóa

Cách thực hiện:

1. Tìm sản phẩm cần xóa.
2. Bấm Xóa.
3. Xác nhận thao tác.

Lưu ý:

- Ứng dụng nên dùng xóa mềm để không làm mất lịch sử đơn hàng.
- Sản phẩm đã xóa sẽ không còn xuất hiện trong POS.
- Lịch sử bán hàng cũ vẫn giữ nguyên.

### Tìm kiếm hàng hóa

Có thể tìm theo:

- Tên sản phẩm.
- Mã sản phẩm.
- SKU.
- Danh mục.

### Lọc hàng hóa

Có thể lọc theo:

- Danh mục.
- Tình trạng tồn kho.
- Tất cả sản phẩm.
- Hàng còn tồn.
- Hàng sắp hết.
- Hàng hết kho.

### Sắp xếp hàng hóa

Có thể sắp xếp theo:

- Tên sản phẩm.
- Giá bán tăng dần.
- Giá bán giảm dần.
- Tồn kho tăng dần.
- Tồn kho giảm dần.
- Sản phẩm mới nhất.

### Import hàng hóa từ Excel

Cách thực hiện:

1. Vào panel Hàng hóa.
2. Bấm Import Excel.
3. Chọn file Excel theo mẫu.
4. Kiểm tra dữ liệu.
5. Xác nhận import.

File mẫu nằm tại:

```txt
templates/product-import-template.xlsx
```

Các cột trong file mẫu:

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

Giải thích từng cột:

#### `category_name`

Tên danh mục sản phẩm.

Nếu danh mục chưa tồn tại, hệ thống có thể tạo mới hoặc để trống tùy logic hiện tại.

#### `product_name`

Tên sản phẩm.

Bắt buộc nhập.

#### `product_code`

Mã sản phẩm.

Nếu để trống, hệ thống sẽ tự tạo từ tên sản phẩm.

#### `sku`

Mã SKU nội bộ.

Có thể để trống.

#### `description`

Mô tả sản phẩm.

Có thể để trống.

#### `cost_price`

Giá vốn.

Nên nhập số, không nhập ký tự tiền tệ.

Ví dụ đúng:

```txt
50000
```

Không nên nhập:

```txt
50.000đ
```

#### `sale_price`

Giá bán.

Nên nhập số.

#### `stock_qty`

Số lượng tồn kho.

Nên nhập số nguyên.

#### `image_url`

Link ảnh sản phẩm.

Có thể để trống.

### Export hàng hóa ra Excel

Cách thực hiện:

1. Vào panel Hàng hóa.
2. Bấm Export Excel.
3. File Excel sẽ được tải về.

File export dùng để:

- Sao lưu dữ liệu hàng hóa.
- Kiểm tra tồn kho.
- Chỉnh sửa dữ liệu bên ngoài.
- Chuyển dữ liệu sang hệ thống khác.

---

## 4.4. Panel Bán hàng

Panel Bán hàng là màn POS dùng để tạo đơn nhanh.

### Bố cục

Trên desktop, màn hình thường chia thành 2 phần:

- Bên trái: danh sách sản phẩm.
- Bên phải: giỏ hàng và thông tin thanh toán.

Trên mobile, giao diện tự co lại để dễ thao tác.

### Tìm sản phẩm để bán

Có thể tìm theo:

- Tên sản phẩm.
- Mã sản phẩm.
- SKU.

### Lọc sản phẩm trong POS

Có thể lọc theo:

- Danh mục.
- Trạng thái còn hàng.
- Từ khóa tìm kiếm.

### Thêm sản phẩm vào giỏ hàng

Cách thực hiện:

1. Tìm sản phẩm.
2. Bấm vào sản phẩm hoặc nút Thêm.
3. Sản phẩm sẽ được đưa vào giỏ hàng.

Nếu sản phẩm đã có trong giỏ, số lượng sẽ tăng lên.

### Sửa số lượng trong giỏ

Cách thực hiện:

1. Trong giỏ hàng, tìm sản phẩm.
2. Tăng hoặc giảm số lượng.
3. Tổng tiền sẽ tự cập nhật.

### Xóa sản phẩm khỏi giỏ

Cách thực hiện:

1. Trong giỏ hàng, tìm sản phẩm.
2. Bấm nút Xóa.
3. Sản phẩm sẽ được bỏ khỏi giỏ.

### Nhập thông tin khách hàng

Khi tạo đơn, có thể nhập:

- Tên khách hàng.
- Số điện thoại.
- Địa chỉ.

Các thông tin này dùng cho quản lý đơn hàng và lịch sử.

### Giảm giá

Có thể nhập số tiền giảm giá cho đơn hàng.

Ví dụ:

```txt
Tạm tính: 500000
Giảm giá: 50000
Khách trả: 450000
```

### Tạo đơn hàng

Cách thực hiện:

1. Thêm sản phẩm vào giỏ.
2. Kiểm tra số lượng.
3. Nhập thông tin khách hàng nếu có.
4. Nhập giảm giá nếu có.
5. Bấm Tạo đơn.
6. Hệ thống tạo đơn hàng.
7. Hệ thống tự trừ tồn kho.
8. Hệ thống ghi lịch sử bán hàng.
9. Hóa đơn giả lập được hiển thị.

### In hóa đơn giả lập

Sau khi tạo đơn, có thể bấm In hóa đơn.

Hóa đơn thường gồm:

- Mã đơn.
- Thời gian.
- Tên khách hàng.
- Số điện thoại.
- Địa chỉ.
- Danh sách sản phẩm.
- Số lượng.
- Đơn giá.
- Thành tiền.
- Giảm giá.
- Tổng thanh toán.

---

## 4.5. Panel Đơn hàng

Panel Đơn hàng dùng để xem và quản lý các đơn đã tạo.

### Thông tin đơn hàng

Mỗi đơn hàng gồm:

- Mã đơn.
- Thời gian tạo.
- Tên khách hàng.
- Số điện thoại.
- Địa chỉ.
- Trạng thái đơn.
- Tổng tiền.
- Giảm giá.
- Giá vốn.
- Lợi nhuận gộp.
- Danh sách sản phẩm trong đơn.

### Trạng thái đơn hàng

Các trạng thái chính:

#### Hoàn thành

Đơn đã bán thành công.

Tồn kho đã bị trừ.

#### Trả hàng

Đơn đã được trả.

Tồn kho được hoàn lại.

### Sửa đơn hàng

Nút Sửa dùng để chỉnh thông tin đơn hàng.

Có thể sửa:

- Tên khách hàng.
- Số điện thoại.
- Địa chỉ.
- Giảm giá.

Lưu ý:

- Việc sửa đơn hàng không nên tự ý thay đổi sản phẩm đã bán nếu chưa có logic hoàn kho và trừ kho lại.
- Nếu cần đổi sản phẩm trong đơn, nên tạo quy trình nâng cao ở phiên bản sau.

### Trả hàng

Nút Trả hàng dùng khi khách trả lại đơn.

Khi bấm Trả hàng:

1. Hệ thống đổi trạng thái đơn sang Trả hàng.
2. Hệ thống hoàn lại tồn kho cho các sản phẩm trong đơn.
3. Hệ thống ghi lịch sử trả hàng.

Lưu ý:

- Không nên bấm Trả hàng nhiều lần cho cùng một đơn.
- Hệ thống cần kiểm tra để tránh hoàn tồn kho lặp lại.

### Lọc đơn hàng

Có thể lọc theo:

- Tất cả.
- Hoàn thành.
- Trả hàng.
- Khoảng thời gian nếu có.

### Sắp xếp đơn hàng

Có thể sắp xếp theo:

- Mới nhất.
- Cũ nhất.
- Tổng tiền cao nhất.
- Tổng tiền thấp nhất.

### Import đơn hàng từ Excel

Cách thực hiện:

1. Vào panel Đơn hàng.
2. Bấm Import Excel.
3. Chọn file theo mẫu.
4. Hệ thống đọc từng dòng và tạo đơn hàng.
5. Hệ thống trừ tồn kho theo số lượng bán.
6. Hệ thống ghi lịch sử import đơn hàng.

File mẫu nằm tại:

```txt
templates/order-import-template.xlsx
```

Các cột trong file mẫu:

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
quantity
sale_price
cost_price
```

Giải thích từng cột:

#### `order_code`

Mã đơn hàng.

Nếu để trống, hệ thống có thể tự tạo mã.

#### `created_at`

Ngày tạo đơn.

Nên dùng định dạng:

```txt
YYYY-MM-DD
```

Ví dụ:

```txt
2026-04-25
```

#### `customer_name`

Tên khách hàng.

Có thể để trống.

#### `customer_phone`

Số điện thoại khách hàng.

Có thể để trống.

#### `customer_address`

Địa chỉ khách hàng.

Có thể để trống.

#### `discount`

Số tiền giảm giá của đơn.

Nếu không giảm giá, nhập:

```txt
0
```

#### `product_code`

Mã sản phẩm.

Hệ thống sẽ ưu tiên tìm sản phẩm theo mã này.

#### `sku`

SKU sản phẩm.

Nếu không có `product_code`, hệ thống có thể tìm theo SKU.

#### `product_name`

Tên sản phẩm.

Nếu không có mã sản phẩm hoặc SKU, hệ thống có thể tìm theo tên.

#### `quantity`

Số lượng bán.

Bắt buộc nhập.

#### `sale_price`

Giá bán tại thời điểm bán.

Nếu để trống, hệ thống có thể lấy giá bán hiện tại của sản phẩm.

#### `cost_price`

Giá vốn tại thời điểm bán.

Nếu để trống, hệ thống có thể lấy giá vốn hiện tại của sản phẩm.

### Export đơn hàng ra Excel

Cách thực hiện:

1. Vào panel Đơn hàng.
2. Bấm Export Excel.
3. File Excel sẽ được tải về.

File export dùng để:

- Sao lưu đơn hàng.
- Đối soát doanh thu.
- Làm báo cáo bán hàng.
- Gửi dữ liệu cho kế toán.

---

## 4.6. Panel Lịch sử

Panel Lịch sử ghi lại các thao tác quan trọng trong hệ thống.

Mục tiêu của lịch sử là giúp người dùng biết:

- Ai đã làm gì.
- Làm lúc nào.
- Tác động đến dữ liệu nào.
- Nội dung thay đổi là gì.
- Bán hàng hoặc nhập hàng gồm những sản phẩm nào.

### Các action thường gặp

#### `product_created`

Ghi khi thêm sản phẩm mới.

Thông tin hiển thị:

- Thời gian.
- Tên action.
- Tên sản phẩm.
- Mã sản phẩm.
- SKU.
- Danh mục.
- Giá vốn.
- Giá bán.
- Tồn kho ban đầu.

#### `product_updated`

Ghi khi sửa sản phẩm.

Thông tin hiển thị:

- Thời gian.
- Tên action.
- Sản phẩm được sửa.
- Dữ liệu trước khi sửa.
- Dữ liệu sau khi sửa.

#### `product_deleted`

Ghi khi xóa sản phẩm.

Thông tin hiển thị:

- Thời gian.
- Tên action.
- Sản phẩm đã xóa.
- Mã sản phẩm.
- SKU.

#### `category_created`

Ghi khi thêm danh mục.

Thông tin hiển thị:

- Thời gian.
- Tên action.
- Tên danh mục.

#### `category_updated`

Ghi khi sửa danh mục.

Thông tin hiển thị:

- Thời gian.
- Tên action.
- Tên cũ.
- Tên mới.

#### `category_deleted`

Ghi khi xóa danh mục.

Thông tin hiển thị:

- Thời gian.
- Tên action.
- Tên danh mục đã xóa.

#### `order_created`

Ghi khi tạo đơn bán hàng.

Thông tin hiển thị:

- Thời gian.
- Mã đơn.
- Khách hàng.
- Số điện thoại.
- Địa chỉ.
- Tổng tiền.
- Giảm giá.
- Danh sách sản phẩm bán ra.
- Số lượng.
- Giá bán.
- Giá vốn.
- Thành tiền.

#### `order_updated`

Ghi khi sửa thông tin đơn hàng.

Thông tin hiển thị:

- Thời gian.
- Mã đơn.
- Dữ liệu trước khi sửa.
- Dữ liệu sau khi sửa.

#### `order_returned`

Ghi khi trả hàng.

Thông tin hiển thị:

- Thời gian.
- Mã đơn.
- Danh sách sản phẩm được hoàn.
- Số lượng hoàn kho.
- Giá trị đơn hàng.

#### `products_imported`

Ghi khi import hàng hóa từ Excel.

Thông tin hiển thị:

- Thời gian.
- Số lượng dòng import.
- Danh sách sản phẩm được thêm.
- Giá vốn.
- Giá bán.
- Tồn kho nhập vào.

#### `orders_imported`

Ghi khi import đơn hàng từ Excel.

Thông tin hiển thị:

- Thời gian.
- Số lượng đơn import.
- Danh sách sản phẩm bán ra.
- Số lượng.
- Giá bán.
- Giá vốn.
- Tổng tiền.

### Thiết kế panel lịch sử

Lịch sử được hiển thị theo từng card riêng.

Mỗi card nên có:

- Màu hoặc icon theo loại action.
- Tiêu đề action dễ hiểu.
- Thời gian.
- Mã tham chiếu nếu có.
- Nội dung chính.
- Chi tiết mở rộng.

Ví dụ:

```txt
Bán hàng
Mã đơn: HD001
Khách: Nguyễn Văn A
Tổng tiền: 450000
Sản phẩm:
- Áo thun basic x2, giá 150000, thành tiền 300000
- Mũ lưỡi trai x1, giá 150000, thành tiền 150000
```

### Lọc lịch sử

Có thể lọc theo:

- Tất cả action.
- Hàng hóa.
- Danh mục.
- Đơn hàng.
- Import.
- Trả hàng.

### Export lịch sử ra Excel

Cách thực hiện:

1. Vào panel Lịch sử.
2. Bấm Export Excel.
3. File Excel sẽ được tải về.

File export có thể dùng để:

- Kiểm tra thao tác.
- Đối soát dữ liệu.
- Xem lịch sử bán hàng.
- Theo dõi thay đổi sản phẩm.
- Theo dõi import dữ liệu.

---

## 4.7. Panel Cài đặt

Panel Cài đặt dùng để cấu hình kết nối Supabase.

### SUPABASE_URL

Là URL project Supabase.

Ví dụ:

```txt
https://your-project.supabase.co
```

### SUPABASE_ANON_KEY

Là public anon key của project Supabase.

Chỉ dùng anon key.

Không dùng service role key.

### Lưu cấu hình

Cách thực hiện:

1. Nhập SUPABASE_URL.
2. Nhập SUPABASE_ANON_KEY.
3. Bấm Lưu cấu hình.
4. Ứng dụng sẽ lưu vào localStorage.
5. Các lần mở sau không cần nhập lại trên cùng trình duyệt.

### Xóa cấu hình

Dùng khi muốn đổi Supabase project hoặc reset kết nối.

Cách thực hiện:

1. Vào Cài đặt.
2. Bấm Xóa cấu hình.
3. Nhập lại thông tin mới nếu cần.

---

## 5. Quy trình sử dụng khuyến nghị

### 5.1. Lần đầu sử dụng

1. Chạy `sql/schema.sql` trong Supabase.
2. Tạo bucket Storage `product-images`.
3. Deploy app hoặc mở `index.html`.
4. Vào Cài đặt.
5. Nhập Supabase URL và anon key.
6. Tạo danh mục.
7. Thêm hàng hóa.
8. Bắt đầu bán hàng.

### 5.2. Quy trình nhập hàng thủ công

1. Vào Danh mục.
2. Tạo danh mục cần dùng.
3. Vào Hàng hóa.
4. Bấm Thêm hàng hóa.
5. Nhập thông tin sản phẩm.
6. Lưu sản phẩm.
7. Kiểm tra tồn kho.

### 5.3. Quy trình nhập hàng bằng Excel

1. Mở file `product-import-template.xlsx`.
2. Điền danh sách sản phẩm.
3. Lưu file.
4. Vào Hàng hóa.
5. Bấm Import Excel.
6. Chọn file.
7. Kiểm tra dữ liệu sau khi import.

### 5.4. Quy trình bán hàng

1. Vào Bán hàng.
2. Tìm sản phẩm.
3. Thêm sản phẩm vào giỏ.
4. Nhập số lượng.
5. Nhập thông tin khách nếu có.
6. Nhập giảm giá nếu có.
7. Bấm Tạo đơn.
8. In hóa đơn nếu cần.

### 5.5. Quy trình trả hàng

1. Vào Đơn hàng.
2. Tìm đơn cần trả.
3. Bấm Trả hàng.
4. Xác nhận.
5. Kiểm tra tồn kho đã được hoàn lại.
6. Kiểm tra lịch sử trả hàng.

### 5.6. Quy trình xem báo cáo

1. Vào Báo cáo.
2. Chọn Hôm nay, Tháng này, Năm nay, Tất cả hoặc Tùy chọn.
3. Xem doanh thu.
4. Xem tiền vốn.
5. Xem lợi nhuận.
6. Xem top sản phẩm.
7. Xem hàng sắp hết.

---

## 6. Import và export Excel

Ứng dụng dùng Excel để hỗ trợ nhập xuất dữ liệu.

### 6.1. Lưu ý khi import Excel

Nên đảm bảo:

- Không đổi tên cột trong file mẫu.
- Không gộp ô.
- Không nhập ký tự tiền tệ vào cột giá.
- Không để trống tên sản phẩm.
- Không để trống số lượng khi import đơn hàng.
- Dùng đúng mã sản phẩm hoặc SKU để hệ thống tìm sản phẩm.

### 6.2. Khi nào nên dùng import hàng hóa

Dùng khi:

- Có nhiều sản phẩm cần nhập cùng lúc.
- Chuyển dữ liệu từ file quản lý cũ.
- Cập nhật nhanh danh sách sản phẩm ban đầu.

### 6.3. Khi nào nên dùng import đơn hàng

Dùng khi:

- Cần nhập lại lịch sử bán hàng.
- Chuyển dữ liệu từ hệ thống cũ.
- Bán hàng offline rồi cập nhật lại vào hệ thống.

### 6.4. Khi nào nên export

Dùng khi:

- Cần sao lưu dữ liệu.
- Cần gửi báo cáo cho kế toán.
- Cần kiểm tra tồn kho.
- Cần phân tích dữ liệu ngoài hệ thống.

---

## 7. Cách deploy lên GitHub Pages

### 7.1. Đưa code lên GitHub

Mở terminal trong thư mục project:

```bash
git init
git add .
git commit -m "Initial commit sales management app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mini-kiot-pos.git
git push -u origin main
```

Thay `YOUR_USERNAME` bằng username GitHub của bạn.

### 7.2. Bật GitHub Pages

1. Vào repository trên GitHub.
2. Chọn Settings.
3. Chọn Pages.
4. Source chọn Deploy from a branch.
5. Branch chọn `main`.
6. Folder chọn `/root`.
7. Bấm Save.

Sau vài phút, app sẽ có link dạng:

```txt
https://YOUR_USERNAME.github.io/mini-kiot-pos/
```

---

## 8. Bảo mật và lưu ý quan trọng

### 8.1. Không dùng service role key

Không bao giờ đưa `SUPABASE_SERVICE_ROLE_KEY` vào frontend.

Chỉ dùng:

```txt
SUPABASE_ANON_KEY
```

### 8.2. Bật RLS

Nên bật Row Level Security cho các bảng.

Nếu app chỉ dùng cá nhân, có thể dùng policy đơn giản.

Nếu app có nhiều người dùng, cần bổ sung hệ thống đăng nhập và policy theo user.

### 8.3. Kiểm tra quyền Storage

Nếu upload ảnh không hoạt động, kiểm tra:

- Bucket có tồn tại không.
- Bucket có đúng tên `product-images` không.
- Policy upload có cho phép anon user không.
- File ảnh có dung lượng quá lớn không.

### 8.4. Sao lưu dữ liệu

Nên export định kỳ:

- Hàng hóa.
- Đơn hàng.
- Lịch sử.

---

## 9. Một số lỗi thường gặp

### 9.1. Không kết nối được Supabase

Nguyên nhân thường gặp:

- Nhập sai SUPABASE_URL.
- Nhập sai SUPABASE_ANON_KEY.
- Project Supabase bị pause.
- Bảng chưa được tạo.
- Chưa chạy `schema.sql`.

Cách xử lý:

1. Vào Cài đặt.
2. Kiểm tra lại URL và key.
3. Chạy lại `sql/schema.sql`.
4. Bấm Làm mới.

### 9.2. Không upload được ảnh

Nguyên nhân thường gặp:

- Chưa tạo bucket `product-images`.
- Bucket chưa public.
- Policy Storage chưa cho upload.
- File ảnh quá lớn.

Cách xử lý:

1. Kiểm tra bucket.
2. Kiểm tra policy.
3. Thử ảnh dung lượng nhỏ hơn.

### 9.3. Import Excel không đúng

Nguyên nhân thường gặp:

- Đổi tên cột.
- Sai định dạng file.
- Cột giá có ký tự tiền tệ.
- Tên sản phẩm bị trống.
- Mã sản phẩm không khớp.

Cách xử lý:

1. Tải lại file mẫu.
2. Điền dữ liệu theo đúng cột.
3. Không gộp ô.
4. Không đổi tên sheet hoặc tên cột nếu không cần thiết.

### 9.4. Báo cáo không có dữ liệu

Nguyên nhân thường gặp:

- Chưa có đơn hàng hoàn thành.
- Đang chọn sai bộ lọc thời gian.
- Đơn hàng đã trả nên không còn tính vào doanh thu.
- Database chưa có dữ liệu.

Cách xử lý:

1. Chọn Tất cả.
2. Kiểm tra danh sách đơn hàng.
3. Tạo thử một đơn mới.
4. Quay lại Báo cáo.

### 9.5. Tồn kho không thay đổi

Nguyên nhân thường gặp:

- RPC chưa được tạo.
- Chưa chạy đúng `schema.sql`.
- Tạo đơn lỗi nhưng giao diện chưa báo rõ.
- Sản phẩm không có dòng tồn kho mặc định.

Cách xử lý:

1. Chạy lại `sql/schema.sql`.
2. Kiểm tra console trình duyệt.
3. Kiểm tra bảng `product_variants`.
4. Tạo lại sản phẩm nếu cần.

---

## 10. Định hướng mở rộng sau này

Có thể phát triển thêm:

- Đăng nhập người dùng.
- Phân quyền nhân viên.
- Quản lý khách hàng.
- Quản lý nhà cung cấp.
- Phiếu nhập kho.
- Phiếu xuất kho.
- Kiểm kho.
- Công nợ khách hàng.
- Công nợ nhà cung cấp.
- Máy quét mã vạch.
- In hóa đơn thật.
- Kết nối máy in Bluetooth.
- Báo cáo theo chi nhánh.
- Báo cáo theo nhân viên bán hàng.
- Sản phẩm có thuộc tính chi tiết hơn theo ngành.
- Đồng bộ dữ liệu nhiều cửa hàng.

---

## 11. Ghi chú vận hành

Ứng dụng này phù hợp nhất cho:

- Cửa hàng nhỏ.
- Cá nhân bán hàng.
- Shop online.
- Cửa hàng dùng điện thoại, máy tính bảng hoặc laptop để quản lý.
- Mô hình cần triển khai nhanh, không muốn xây backend riêng.

Với cửa hàng có nhiều nhân viên hoặc nhiều chi nhánh, nên bổ sung đăng nhập, phân quyền và chính sách RLS chi tiết hơn trước khi sử dụng thực tế.
