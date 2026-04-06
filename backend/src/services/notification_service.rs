use uuid::Uuid;

use crate::{
    error::AppError,
    models::{
        notification::{CreateSystemAnnouncementInput, NotificationQuery},
        order::{Order, OrderItem},
    },
    repositories::notification_repo,
    state::AppState,
};

/// Count `pending` orders created within the last hour.
///
/// Used by admin notification channels (SSE/polling) to surface new-order signals.
pub async fn count_recent_pending_orders(state: &AppState) -> Result<i64, AppError> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM orders WHERE status = 'pending' AND created_at > NOW() - INTERVAL '1 hour'",
    )
    .fetch_one(&state.db)
    .await?;

    Ok(count)
}

pub async fn push_user_notification(
    state: &AppState,
    user_id: Uuid,
    notif_type: &str,
    title: &str,
    message: &str,
    related_type: Option<&str>,
    related_id: Option<Uuid>,
    data_json: serde_json::Value,
) -> Result<serde_json::Value, AppError> {
    let row = notification_repo::insert_user_notification(
        &state.db,
        notification_repo::CreateUserNotification {
            user_id,
            notif_type,
            title,
            message,
            related_type,
            related_id,
            data_json,
        },
    )
    .await?;

    Ok(serde_json::json!(row))
}

pub async fn list_user_notifications(
    state: &AppState,
    user_id: Uuid,
    query: &NotificationQuery,
) -> Result<serde_json::Value, AppError> {
    let (items, total) = notification_repo::list_user_notifications(&state.db, user_id, query).await?;
    let total_pages = (total + query.limit - 1) / query.limit;

    Ok(serde_json::json!({
        "items": items,
        "total": total,
        "page": query.page,
        "limit": query.limit,
        "total_pages": total_pages,
    }))
}

pub async fn unread_count(state: &AppState, user_id: Uuid) -> Result<serde_json::Value, AppError> {
    let unread = notification_repo::count_unread(&state.db, user_id).await?;
    Ok(serde_json::json!({ "unread": unread }))
}

pub async fn mark_all_read(state: &AppState, user_id: Uuid) -> Result<serde_json::Value, AppError> {
    let updated = notification_repo::mark_all_read(&state.db, user_id).await?;
    Ok(serde_json::json!({ "updated": updated }))
}

pub async fn publish_system_announcement(
    state: &AppState,
    admin_id: Uuid,
    input: &CreateSystemAnnouncementInput,
) -> Result<serde_json::Value, AppError> {
    let title = input.title.trim();
    let message = input.message.trim();

    if title.is_empty() {
        return Err(AppError::BadRequest("Tiêu đề thông báo không được để trống".into()));
    }
    if message.is_empty() {
        return Err(AppError::BadRequest("Nội dung thông báo không được để trống".into()));
    }

    let announcement = notification_repo::create_announcement(&state.db, admin_id, title, message).await?;
    let delivered = notification_repo::broadcast_announcement_to_users(
        &state.db,
        announcement.id,
        &announcement.title,
        &announcement.message,
    )
    .await?;

    Ok(serde_json::json!({
        "announcement": announcement,
        "delivered": delivered,
    }))
}

pub async fn list_system_announcements(
    state: &AppState,
    query: &NotificationQuery,
) -> Result<serde_json::Value, AppError> {
    let (items, total) = notification_repo::list_announcements(&state.db, query).await?;
    let total_pages = (total + query.limit - 1) / query.limit;
    Ok(serde_json::json!({
        "items": items,
        "total": total,
        "page": query.page,
        "limit": query.limit,
        "total_pages": total_pages,
    }))
}

pub async fn notify_order_created(
    state: &AppState,
    user_id: Uuid,
    order: &Order,
    items: &[OrderItem],
) -> Result<(), AppError> {
    let product_name = items
        .first()
        .map(|item| item.product_name.as_str())
        .unwrap_or("đơn hàng của bạn");

    let message = format!(
        "Bạn đã đặt thành công đơn {} với sản phẩm {}",
        order.order_code, product_name
    );

    push_user_notification(
        state,
        user_id,
        "order_created",
        "Đặt hàng thành công",
        &message,
        Some("order"),
        Some(order.id),
        serde_json::json!({
            "order_id": order.id,
            "order_code": order.order_code,
            "status": order.status,
        }),
    )
    .await?;

    Ok(())
}

fn order_status_label(status: &str) -> &str {
    match status {
        "pending" => "Chờ xác nhận",
        "confirmed" => "Đã xác nhận",
        "shipping" => "Đang giao",
        "delivered" => "Hoàn thành",
        "cancelled" => "Đã huỷ",
        _ => status,
    }
}

pub async fn notify_order_status_updated(
    state: &AppState,
    user_id: Uuid,
    order: &Order,
) -> Result<(), AppError> {
    let status_label = order_status_label(&order.status);
    let message = format!("Đơn {} đã chuyển sang trạng thái: {}", order.order_code, status_label);

    push_user_notification(
        state,
        user_id,
        "order_status",
        "Cập nhật đơn hàng",
        &message,
        Some("order"),
        Some(order.id),
        serde_json::json!({
            "order_id": order.id,
            "order_code": order.order_code,
            "status": order.status,
        }),
    )
    .await?;

    Ok(())
}
