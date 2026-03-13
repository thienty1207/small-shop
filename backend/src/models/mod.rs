// models/mod.rs — ONLY pub mod declarations and re-exports are allowed here
// NEVER write any logic, structs, or functions in this file

pub mod admin;
pub mod cart;
pub mod contact;
pub mod coupon;
pub mod order;
pub mod product;
pub mod review;
pub mod settings;
pub mod user;

pub use user::{AuthResponse, Claims, GoogleUserInfo, NewUser, User, UserPublic};
