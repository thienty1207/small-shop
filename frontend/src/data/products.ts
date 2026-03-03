import candle1 from "@/assets/products/candle-1.jpg";
import candle2 from "@/assets/products/candle-2.jpg";
import candle3 from "@/assets/products/candle-3.jpg";
import card1 from "@/assets/products/card-1.jpg";
import card2 from "@/assets/products/card-2.jpg";
import card3 from "@/assets/products/card-3.jpg";
import tote1 from "@/assets/products/tote-1.jpg";
import tote2 from "@/assets/products/tote-2.jpg";
import soap1 from "@/assets/products/soap-1.jpg";
import mug1 from "@/assets/products/mug-1.jpg";

export interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  badge?: "Handmade" | "Mới" | "Hot";
  description?: string;
  material?: string;
  care?: string;
  rating?: number;
  reviewCount?: number;
  variants?: { label: string; options: string[] }[];
}

export interface Category {
  name: string;
  slug: string;
  image: string;
}

export interface Review {
  id: string;
  name: string;
  avatar: string;
  content: string;
  rating: number;
}

export const products: Product[] = [
  {
    id: "1",
    slug: "nen-thom-dau-nanh",
    name: "Nến Thơm Đậu Nành",
    price: 180000,
    originalPrice: 240000,
    image: candle1,
    images: [candle1, candle3],
    category: "Nến",
    badge: "Handmade",
    description: "Nến thơm làm từ sáp đậu nành tự nhiên, hương lavender nhẹ nhàng, thời gian cháy 40 giờ.",
    material: "Sáp đậu nành, tinh dầu thiên nhiên, bấc cotton",
    care: "Cắt bấc còn 5mm trước khi thắp. Không thắp quá 4 giờ liên tục.",
    rating: 4.8,
    reviewCount: 24,
    variants: [
      { label: "Hương", options: ["Lavender", "Vanilla", "Quế"] },
      { label: "Size", options: ["Nhỏ (100g)", "Lớn (200g)"] },
    ],
  },
  {
    id: "2",
    slug: "thiep-chuc-mung-ca-nhan-hoa",
    name: "Thiệp Chúc Mừng Cá Nhân Hóa",
    price: 50000,
    image: card1,
    images: [card1, card3],
    category: "Thiệp",
    badge: "Mới",
    description: "Thiệp chúc mừng vẽ tay phong cách botanical, có thể cá nhân hóa tên và lời chúc.",
    material: "Giấy kraft 300gsm, mực in thân thiện môi trường",
    care: "Bảo quản nơi khô ráo, tránh ẩm.",
    rating: 4.9,
    reviewCount: 56,
  },
  {
    id: "3",
    slug: "tui-vai-canvas-hoa",
    name: "Túi Vải Canvas Hoa",
    price: 220000,
    originalPrice: 280000,
    image: tote1,
    images: [tote1, tote2],
    category: "Túi",
    description: "Túi vải canvas in hoa tươi sáng, dày dặn, phù hợp đi học, đi chợ, đi chơi.",
    material: "Vải canvas cotton 12oz",
    care: "Giặt tay nhẹ nhàng, phơi bóng mát.",
    rating: 4.7,
    reviewCount: 18,
    variants: [
      { label: "Mẫu", options: ["Hoa hồng", "Hoa cúc", "Lá xanh"] },
    ],
  },
  {
    id: "4",
    slug: "bo-xa-phong-thu-cong",
    name: "Bộ Xà Phòng Thủ Công",
    price: 150000,
    image: soap1,
    category: "Xà phòng",
    description: "Bộ 4 bánh xà phòng thủ công từ nguyên liệu tự nhiên, gói giấy kraft xinh xắn.",
    material: "Dầu dừa, bơ shea, tinh dầu tự nhiên",
    care: "Bảo quản nơi khô ráo. Sử dụng trong 6 tháng.",
    rating: 4.6,
    reviewCount: 32,
  },
  {
    id: "5",
    slug: "nen-sap-ong",
    name: "Nến Sáp Ong",
    price: 180000,
    originalPrice: 240000,
    image: candle2,
    category: "Nến",
    badge: "Handmade",
    description: "Nến sáp ong nguyên chất, tạo hình tổ ong, hương mật ong tự nhiên.",
    material: "Sáp ong nguyên chất 100%",
    care: "Cắt bấc trước khi thắp.",
    rating: 4.5,
    reviewCount: 15,
  },
  {
    id: "6",
    slug: "thiep-nghe-thuat-truu-tuong",
    name: "Thiệp Nghệ Thuật Trừu Tượng",
    price: 90000,
    originalPrice: 120000,
    image: card2,
    category: "Thiệp",
    description: "Thiệp nghệ thuật trừu tượng phong cách minimalist, in trên giấy mỹ thuật.",
    material: "Giấy mỹ thuật 250gsm",
    care: "Bảo quản nơi khô ráo.",
    rating: 4.4,
    reviewCount: 8,
  },
  {
    id: "7",
    slug: "tui-day-thung",
    name: "Túi Đay Thùng",
    price: 210000,
    originalPrice: 280000,
    image: tote2,
    category: "Túi",
    description: "Túi đay dạng thùng, bền bỉ, thân thiện môi trường.",
    material: "Đay tự nhiên, quai cotton",
    care: "Lau bằng khăn ẩm, phơi khô tự nhiên.",
    rating: 4.3,
    reviewCount: 12,
  },
  {
    id: "8",
    slug: "ly-gom-thu-cong",
    name: "Ly Gốm Thủ Công",
    price: 120000,
    originalPrice: 160000,
    image: mug1,
    category: "Gốm",
    description: "Ly gốm thủ công men hai tông, phù hợp uống trà và cà phê.",
    material: "Đất sét nung, men tự nhiên",
    care: "Rửa tay nhẹ nhàng, không dùng lò vi sóng.",
    rating: 4.8,
    reviewCount: 42,
    variants: [
      { label: "Màu", options: ["Kem - Nâu", "Trắng - Xám", "Xanh - Trắng"] },
    ],
  },
  {
    id: "9",
    slug: "nen-lavender-sage",
    name: "Nến Lavender & Sage",
    price: 160000,
    originalPrice: 240000,
    image: candle3,
    category: "Nến",
    description: "Nến thơm hương lavender và sage, đựng trong hũ thủy tinh amber.",
    material: "Sáp đậu nành, tinh dầu lavender & sage",
    care: "Cắt bấc trước khi thắp. Thời gian cháy: 35 giờ.",
    rating: 4.7,
    reviewCount: 19,
  },
  {
    id: "10",
    slug: "thiep-botanical",
    name: "Bộ Thiệp Botanical",
    price: 90000,
    originalPrice: 120000,
    image: card3,
    category: "Thiệp",
    description: "Bộ 5 thiệp hoa ép botanical phong cách tự nhiên.",
    material: "Giấy cotton 300gsm",
    care: "Bảo quản nơi khô ráo.",
    rating: 4.9,
    reviewCount: 28,
  },
];

export const categories: Category[] = [
  { name: "Nến", slug: "nen", image: "" },
  { name: "Thiệp & In Ấn", slug: "thiep", image: "" },
  { name: "Túi Vải", slug: "tui", image: "" },
  { name: "Trang Sức", slug: "trang-suc", image: "" },
];

export const reviews: Review[] = [
  {
    id: "1",
    name: "Emily T.",
    avatar: "",
    content: "Nến thơm rất dịu, cháy đều, mình rất thích! Sẽ mua lại.",
    rating: 5,
  },
  {
    id: "2",
    name: "Minh A.",
    avatar: "",
    content: "Quà tặng bạn gái, bạn ấy rất thích. Gói quà xinh lắm!",
    rating: 5,
  },
  {
    id: "3",
    name: "Hà N.",
    avatar: "",
    content: "Túi vải rất dày dặn và đẹp, in hoa rõ nét. Đáng tiền.",
    rating: 4,
  },
  {
    id: "4",
    name: "Lan P.",
    avatar: "",
    content: "Thiệp đẹp quá, vẽ tay rất tỉ mỉ. Sẽ đặt thêm cho sinh nhật.",
    rating: 5,
  },
];

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};
