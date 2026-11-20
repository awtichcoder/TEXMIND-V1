# Bảng điểm TexMind

Tạo lúc: 2026-11-20T07:20:22.513Z

Điểm = so `normalized.json` của mỗi lần chạy với `dataset/samples/<mã>/gold.json` (gold do người duyệt).
Output AI không phải gold. `strict` chấm chặt câu chữ; `tolerant` bỏ qua khác biệt định dạng nhỏ.
Cột "Gold duyệt bởi": "người" = gold do người duyệt; "AI" = gold do Claude (AI) duyệt, CHƯA có người duyệt (điểm chỉ mang tính tham khảo); "gold cũ" = 6 gold làm trước 19/11/2026.

## Điểm trung bình theo model (tập test)

Mỗi mẫu chỉ tính lần chạy MỚI NHẤT của model đó; không tính lần chạy replay (`--raw`, chấm lại raw đã lưu).

| Model | Số lần chạy tính | Số mẫu | Strict TB | Tolerant TB |
|---|---:|---:|---:|---:|
| gpt-6.1-sol | 5 | 5 | 1.0000 | 1.0000 |

## Điểm trung bình theo model (tập dev – chỉ để theo dõi)

| Model | Số lần chạy tính | Số mẫu | Strict TB | Tolerant TB |
|---|---:|---:|---:|---:|
| gpt-6.1-sol | 3 | 3 | 1.0000 | 1.0000 |

## Tất cả lần chạy

| Run ID | Mẫu | Split | Model | Chế độ | Template | Trạng thái | Schema | Bộ chấm | Gold duyệt bởi | Strict | Tolerant |
|---|---|---|---|---|---|---|---|---|---|---:|---:|
| 2026-11-19_0911_replay_qd_067 | qd_067 | dev | replay | saved_raw | TM-QD-002 | completed | hợp lệ | 2.1 | gold cũ | 1.0000 | 1.0000 |
| 2026-11-19_0927_gpt-6.1-sol_qd_067 | qd_067 | dev | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | gold cũ | 1.0000 | 1.0000 |
| 2026-11-19_0932_gpt-6.1-sol_qd_014 | qd_014 | dev | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | gold cũ | 1.0000 | 1.0000 |
| 2026-11-19_0934_gpt-6.1-sol_qd_021 | qd_021 | dev | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | gold cũ | 1.0000 | 1.0000 |
| 2026-11-19_0944_gpt-6.1-sol_qd_014 | qd_014 | dev | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | gold cũ | 1.0000 | 1.0000 |
| 2026-11-19_0944_gpt-6.1-sol_qd_067 | qd_067 | dev | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | gold cũ | 1.0000 | 1.0000 |
| 2026-11-19_0945_gpt-6.1-sol_qd_021 | qd_021 | dev | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | gold cũ | 1.0000 | 1.0000 |
| 2026-11-19_0947_gpt-6.1-sol_qd_042 | qd_042 | test | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 0.9553 | 0.9553 |
| 2026-11-19_0949_gpt-6.1-sol_qd_096 | qd_096 | test | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_0951_gpt-6.1-sol_qd_035 | qd_035 | test | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 0.8333 | 0.8333 |
| 2026-11-19_0951_gpt-6.1-sol_qd_081 | qd_081 | train | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 0.9839 | 0.9839 |
| 2026-11-19_0953_gpt-6.1-sol_qd_100 | qd_100 | train | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_0954_gpt-6.1-sol_qd_022 | qd_022 | test | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_0956_gpt-6.1-sol_qd_040 | qd_040 | train | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_0957_gpt-6.1-sol_qd_068 | qd_068 | train | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_0958_gpt-6.1-sol_qd_072 | qd_072 | test | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1000_gpt-6.1-sol_qd_082 | qd_082 | train | gpt-6.1-sol | ai_extract | TM-QD-001 | completed | hợp lệ | 2.1 | AI | 0.7949 | 0.7949 |
| 2026-11-19_1016_gpt-6.1-sol_qd_082 | qd_082 | train | gpt-6.1-sol | ai_extract | TM-QD-001 | completed | hợp lệ | 2.1 | AI | 0.9615 | 0.9615 |
| 2026-11-19_1017_gpt-6.1-sol_qd_042 | qd_042 | test | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1018_gpt-6.1-sol_qd_096 | qd_096 | test | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1020_gpt-6.1-sol_qd_081 | qd_081 | train | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 0.9167 | 0.9167 |
| 2026-11-19_1021_gpt-6.1-sol_qd_035 | qd_035 | test | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1024_gpt-6.1-sol_qd_100 | qd_100 | train | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1025_gpt-6.1-sol_qd_022 | qd_022 | test | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1026_gpt-6.1-sol_qd_040 | qd_040 | train | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1026_gpt-6.1-sol_qd_068 | qd_068 | train | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1027_gpt-6.1-sol_qd_072 | qd_072 | test | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1029_replay_qd_068 | qd_068 | train | replay | saved_raw | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1029_replay_qd_100 | qd_100 | train | replay | saved_raw | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1030_replay_qd_042 | qd_042 | test | replay | saved_raw | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1030_replay_qd_081 | qd_081 | train | replay | saved_raw | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 0.9167 | 0.9167 |
| 2026-11-19_1030_replay_qd_082 | qd_082 | train | replay | saved_raw | TM-QD-001 | completed | hợp lệ | 2.1 | AI | 0.9615 | 0.9615 |
| 2026-11-19_1030_replay_qd_096 | qd_096 | test | replay | saved_raw | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1031_gpt-6.1-sol_qd_021 | qd_021 | dev | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | gold cũ | 1.0000 | 1.0000 |
| 2026-11-19_1031_replay_qd_022 | qd_022 | test | replay | saved_raw | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1031_replay_qd_035 | qd_035 | test | replay | saved_raw | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1031_replay_qd_040 | qd_040 | train | replay | saved_raw | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1031_replay_qd_068 | qd_068 | train | replay | saved_raw | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1031_replay_qd_072 | qd_072 | test | replay | saved_raw | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1031_replay_qd_100 | qd_100 | train | replay | saved_raw | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1032_gpt-6.1-sol_qd_067 | qd_067 | dev | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | gold cũ | 1.0000 | 1.0000 |
| 2026-11-19_1034_gpt-6.1-sol_qd_014 | qd_014 | dev | gpt-6.1-sol | ai_extract | TM-QD-002 | completed | hợp lệ | 2.1 | gold cũ | 1.0000 | 1.0000 |
| 2026-11-19_1040_replay_qd_022 | qd_022 | test | replay | saved_raw | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1040_replay_qd_040 | qd_040 | train | replay | saved_raw | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1040_replay_qd_068 | qd_068 | train | replay | saved_raw | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 1.0000 | 1.0000 |
| 2026-11-19_1040_replay_qd_081 | qd_081 | train | replay | saved_raw | TM-QD-002 | completed | hợp lệ | 2.1 | AI | 0.9167 | 0.9167 |
