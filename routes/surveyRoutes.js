const mongoose=require('mongoose');
const requireLogin=require('../middlewares/requireLogin');
const requireCredits=require('../middlewares/requireCredits');
const Mailer= require('../services/Mailer');
const surveyTemplate= require('../services/emailTemplates/surveyTemplate');
const _ = require("lodash");
const {Path}=require('path-parser');
const bodyParser = require("body-parser");
const { URL } = require("url");
const Survey=mongoose.model('surveys');

module.exports = app => {
  app.get('/api/surveys', requireLogin, async (req, res) => {
    const surveys = await Survey.find({_user: req.user.id})
    . select({recipients: false});
    res.send(surveys);
  });

  app.get("/api/survey/:surveyId/:choice", (req, res) => {
    res.send("Thanks for voting!");
  });

  app.post("/api/surveys/webhooks", bodyParser.raw(), (req, res) => {
    var key= Object.keys(req.body)[1];
    const { recipient: email, url, event } = req.body[key];
  
    const p = Path.createPath('/api/survey/:surveyId/:choice');
    const match = p.test(new URL(url).pathname);
    if (match && event === "clicked") {
      Survey.updateOne(
        {
          _id: match.surveyId,
          recipients: {
            $elemMatch: { email: email, responded: false }
          }
        },
        {
          $inc: {[match.choice]: 1 },
          $set: { "recipients.$.responded": true },
          lastResponded: new Date()
        }
      ).exec();
    }
    res.send({});
  });
  
  app.post('/api/surveys', requireLogin, requireCredits, async (req,res)=>{
        const { title, subject, body, recipients } = req.body;

        const survey=new Survey({
            title, 
            subject, 
            body,
            recipients: recipients.split(',').map(email => ({ email: email.trim() })), 
            _user: req.user.id,
            dateSent: Date.now()
        });
        
        const mailer=new Mailer(survey, surveyTemplate(survey));
        try{
          await mailer.send();
          await survey.save();
          req.user.credits -= 1;
          const user = await req.user.save();
          res.send(user);
        } catch(err){
          res.status(422).send(err);
        }
    });
};