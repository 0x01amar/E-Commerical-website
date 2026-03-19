import { 
  PhoneIcon, 
  EnvelopeIcon, 
  MapPinIcon, 
  ClockIcon 
} from "@heroicons/react/24/outline";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";

function Contact() {
  return (
    <div className="max-w-7xl mx-auto px-6 space-y-24 py-12 pt-24">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h2 className="text-secondary font-bold tracking-[0.2em] uppercase text-sm">Get In Touch</h2>
        <h1 className="text-5xl md:text-7xl font-heading font-bold">Contact Our Studio</h1>
        <p className="text-lg text-neutral-dark/60 font-body leading-relaxed">
          Whether you're looking for a custom piece or have questions about our collections, our team is here to help you bring your vision to life.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
        {/* Contact Form */}
        <div className="space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl font-heading font-bold">Send us a Message</h2>
            <p className="text-neutral-dark/40 font-body">Required fields are marked *</p>
          </div>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Full Name *</label>
                <Input placeholder="John Doe" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Email Address *</label>
                <Input type="email" placeholder="john@example.com" required />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Subject</label>
              <Input placeholder="Custom Order Inquiry" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Message *</label>
              <textarea 
                className="w-full border border-neutral-dark/10 p-4 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 rounded-sm min-h-48 transition-all"
                placeholder="Tell us about your project..."
                required
              />
            </div>

            <Button className="w-full h-16 text-lg" type="submit">Send Message</Button>
          </form>
        </div>

        {/* Contact Info */}
        <div className="space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl font-heading font-bold">Visit Our Showroom</h2>
            <p className="text-neutral-dark/40 font-body">Experience the craftsmanship in person.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { icon: MapPinIcon, title: "Our Location", content: "Iron Art Street, Jodhpur,\nRajasthan, India 342001" },
              { icon: PhoneIcon, title: "Phone", content: "+91 98765 43210\n+91 12345 67890" },
              { icon: EnvelopeIcon, title: "Email", content: "studio@maasheela.com\nsupport@maasheela.com" },
              { icon: ClockIcon, title: "Studio Hours", content: "Mon - Sat: 10AM - 7PM\nSun: By Appointment" }
            ].map((item, i) => (
              <Card key={i} className="p-8 border-none bg-neutral-cream space-y-4">
                <item.icon className="w-8 h-8 text-primary" />
                <h3 className="font-heading text-lg font-bold">{item.title}</h3>
                <p className="text-sm text-neutral-dark/60 font-body whitespace-pre-line leading-relaxed">{item.content}</p>
              </Card>
            ))}
          </div>

          {/* Google Maps Embed */}
          <div className="space-y-4 pt-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Find Us on the Map</label>
            <div className="aspect-video w-full rounded-sm overflow-hidden border border-neutral-dark/5 shadow-lg group">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14302.463212345678!2d73.0243!3d26.2389!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjbCsDE0JzIwLjAiTiA3M8KwMDEnMjcuNSJF!5e0!3m2!1sen!2sin!4v1710000000000!5m2!1sen!2sin" 
                width="100%" 
                height="100%" 
                style={{ border: 0, filter: 'grayscale(0.2) contrast(1.1)' }} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                className="transition-all duration-700 group-hover:grayscale-0 group-hover:scale-[1.02]"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;
