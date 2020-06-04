const keys = require("../config/keys");

var domain = keys.mailgunDomain;
var mailgun = require("mailgun-js")({
  apiKey: keys.mailgunKey,
  domain: domain
});

class Mailer {
  constructor({ subject, recipients }, content) {
    this.data = {
      from: "no-reply@rebeccasoren.com",
      to: this.formatAddresses(recipients),
      subject: subject,
      html: content
    };
  }
  
  formatAddresses(recipients) {
    return recipients.map(({ email }) => email).join(",");
  }

  async send() {
    try{
      const resp = await mailgun.messages().send(this.data);
    return resp;
    } catch(err){
      console.log(err);
    }
    
  }
}

module.exports = Mailer;