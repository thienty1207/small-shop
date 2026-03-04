import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const About = () => {
  return (
    <div className="min-h-screen bg-surface-pink flex flex-col">
      <Header />
      <div className="flex-1 container mx-auto px-4 md:px-8 pt-24 pb-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-3xl font-bold text-foreground text-center mb-6">Về Chúng Tôi</h1>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Handmade Haven</strong> ra đời từ tình yêu với những sản phẩm thủ công, nơi mỗi món đồ đều mang trong mình câu chuyện và sự tỉ mỉ của người làm ra chúng.
            </p>
            <p>
              Chúng tôi tin rằng những món quà handmade không chỉ đẹp mà còn chứa đựng tình cảm chân thành. Từ nến thơm đậu nành, thiệp vẽ tay, đến túi vải canvas — tất cả đều được làm thủ công bởi các nghệ nhân Việt Nam.
            </p>
            <p>
              Sứ mệnh của chúng tôi là mang đến những sản phẩm thủ công chất lượng, thân thiện môi trường, và giúp bạn tìm được món quà ý nghĩa cho mọi dịp.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default About;
