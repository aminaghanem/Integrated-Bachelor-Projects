import Image from "next/image";

export default function Footer() {
  return (
    <footer
      style={{ backgroundColor: "#4AA7FF", height: "600px" }}
      className="text-white flex items-start pt-16"
    >
      <div className="mx-auto max-w-6xl px-4 w-full">
        <div className="grid md:grid-cols-3 items-start gap-6 md:gap-16 lg:gap-24">
          <div>
            <Image
              src="/planet play.png"
              alt="Planet Play"
              width={435}
              height={185}
              style={{ width: "100%", maxWidth: "435px", height: "auto" }}
            />
          </div>
          <div className="md:col-span-2 flex flex-col items-center">
            <p
              style={{
                fontFamily: "Gafiton",
                fontWeight: 400,
                fontSize: "36px",
                lineHeight: "103%",
                letterSpacing: "5%",
                textTransform: "capitalize",
                width: "570px",
              }}
              className="mb-10 max-w-2xl"
            >
              Discover the Planet One Country at a Time
            </p>

            <div className="grid grid-cols-2 gap-20 text-left">
              <div style={{ width: "242px" }}>
                <h3
                  style={{
                    fontFamily: "Helvetica",
                    fontWeight: 700,
                    fontStyle: "oblique",
                    fontSize: "20px",
                    lineHeight: "105%",
                    letterSpacing: "5%",
                    textTransform: "uppercase",
                  }}
                  className="mb-4"
                >
                  Contact us
                </h3>

                <ul
                  className="space-y-3"
                  style={{
                    fontFamily: "Helvetica",
                    fontWeight: 400,
                    fontSize: "18px",
                    lineHeight: "100%",
                    letterSpacing: "5%",
                    textTransform: "capitalize",
                  }}
                >
                  <li>
                    <p>Hello@brandname.com</p>
                  </li>
                  <li>
                    <p>+20 20198192382</p>
                  </li>
                  <li>
                    <p>5th settlement, new Cairo, Cairo, Egypt </p>
                  </li>
                </ul>
              </div>

              <div style={{ width: "242px" }}>
                <h3
                  style={{
                    fontFamily: "Helvetica",
                    fontWeight: 700,
                    fontStyle: "oblique",
                    fontSize: "20px",
                    lineHeight: "105%",
                    letterSpacing: "5%",
                    textTransform: "uppercase",
                  }}
                  className="mb-4"
                >
                  About us
                </h3>

                <ul
                  className="space-y-3"
                  style={{
                    fontFamily: "Helvetica",
                    fontWeight: 400,
                    fontSize: "18px",
                    lineHeight: "100%",
                    letterSpacing: "5%",
                    textTransform: "capitalize",
                  }}
                >
                  <li>
                    <p>Our Story</p>
                  </li>
                  <li>
                    <p>Mission & Vision</p>
                  </li>
                  <li>
                    <p>FAQs</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
