# Bảng điểm TexMind

Tạo lúc: 2026-11-19T02:47:34.856Z

Điểm = so `normalized.json` của mỗi lần chạy với `dataset/samples/<mã>/gold.json` (gold do người duyệt).
Output AI không phải gold. `strict` chấm chặt câu chữ; `tolerant` bỏ qua khác biệt định dạng nhỏ.

## Điểm trung bình theo model (tập test)

Không tính lần chạy replay (`--raw`, chấm lại raw đã lưu).

| Model | Số lần chạy | Số mẫu | Strict TB | Tolerant TB |
|---|---:|---:|---:|---:|
| gpt-6.1-sol | 4 | 2 | 0.9972 | 0.9972 |

## Tất cả lần chạy

| Run ID | Mẫu | Split | Model | Chế độ | Template | Trạng thái | Schema | Bộ chấm | Strict | Tolerant |
|---|---|---|---|---|---|---|---|---|---:|---:|
| 2026-11-19_0911_replay_qd_067 | qd_067 | test | replay | saved_raw | TM-QD-002 | completed | hợp lệ | 2.1 | 0.9889 | 0.9889 |
| 2026-11-19_0927_gpt-6.1-sol_qd_067 | qd_067 | test | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | 0.9889 | 0.9889 |
| 2026-11-19_0932_gpt-6.1-sol_qd_014 | qd_014 | test | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | 1.0000 | 1.0000 |
| 2026-11-19_0934_gpt-6.1-sol_qd_021 | qd_021 | dev | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | 0.8222 | 0.8222 |
| 2026-11-19_0944_gpt-6.1-sol_qd_014 | qd_014 | test | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | 1.0000 | 1.0000 |
| 2026-11-19_0944_gpt-6.1-sol_qd_067 | qd_067 | test | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | 1.0000 | 1.0000 |
| 2026-11-19_0945_gpt-6.1-sol_qd_021 | qd_021 | dev | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | 0.8333 | 0.8333 |
