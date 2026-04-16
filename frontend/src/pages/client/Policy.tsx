import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const Policy = () => {
  return (
    <div className="min-h-screen bg-surface-pink flex flex-col">
      <Header />
      <div className="flex-1 container mx-auto px-4 md:px-8 pt-36 md:pt-40 pb-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-2xl font-bold text-foreground text-center mb-6">Chính Sách</h1>
          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">Vận Chuyển</h2>
              <p>Miễn phí vận chuyển cho đơn hàng từ 500.000đ. Thời gian giao hàng: 2-5 ngày làm việc (nội thành), 5-7 ngày (tỉnh).</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">Đổi Trả</h2>
              <p>Hỗ trợ đổi trả trong 7 ngày nếu sản phẩm bị lỗi do sản xuất. Sản phẩm cá nhân hóa không áp dụng đổi trả.</p>
            </section>
            <section>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">Bảo Mật</h2>
              <p>Thông tin cá nhân của bạn được bảo mật tuyệt đối. Chúng tôi không chia sẻ thông tin với bên thứ ba.</p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Policy;
