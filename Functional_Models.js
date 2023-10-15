const { ObjectId } = require("mongodb");
const nodemailer = require("nodemailer");


//duplicated Interview Data Chacking process
const duplicate_Interview_Checked = async (userId, user_Collection, JobId, org_catagories) => {

    const query = { _id: new ObjectId(userId) }
    const checked = await user_Collection.findOne(query);

    let duplicate;

    if (org_catagories === process.env.ORG_CATAGORIES) {

        duplicate = checked?.Non_org_Interview
            ?.find((v) => v.id.toString().replace(/ObjectId\("(.*)"\)/, "$1") === JobId)

    }
    else {
        duplicate = checked?.InterviewCall
            ?.find((v) => v.id.toString().replace(/ObjectId\("(.*)"\)/, "$1") === JobId)

    }


    if (duplicate) {
        return true
    }
    return false


}
//email sender processs 

const send_email_nodemaider = async (email, email_body, companyName) => {

    //console.log(email);
    await nodemailer.createTestAccount();
    // let testAccount =
    // console.log(testAccount);

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER_NAME, // generated ethereal user
            pass: process.env.SMTP_PASSWORD, // generated ethereal password
        },
    });

    // send mail with defined transport object
    let info = await transporter.sendMail({
        from: 'amsr215019@gmail.com', // sender address
        to: `${email}`, // list of receivers email
        subject: `Interview Call From ${companyName}`, // Subject line
        text: email_body, // plain text body
        html: `<b>${email_body}</b>`, // html body
    });
    return info;

}

const Interview_called_Information = async (userId, JobId, email, user_Collection, org_catagories, companyName) => {

    const filter = { _id: new ObjectId(userId) };
    let updateDoc;

    if (org_catagories === process.env.ORG_CATAGORIES) {
        updateDoc = {
            $push: { Non_org_Interview: { id: new ObjectId(JobId), email, companyName } },
        };

    }
    else {
        updateDoc = {
            $push: { InterviewCall: { id: new ObjectId(JobId), email, companyName } },
        };

    }
    const result = await user_Collection.updateOne(filter, updateDoc);


    return { status: true, data: result };

}

//get Interview list for Non Orginaztiona And Organization

const Interview_List = async (id, user_Collection, org_catagories) => {



    let query;
    if (process.env.ORG_CATAGORIES === org_catagories) {
        query = { Non_org_Interview: { $elemMatch: { id: new ObjectId(id) } } };
    }
    else {
        query = { InterviewCall: { $elemMatch: { id: new ObjectId(id) } } };
    }

    const cursor = user_Collection.find(query).project({
        InterviewCall: 0, role: 0, Non_org_Interview: 0, Non_org_applicants: 0, applicants: 0
    });
    const result = await cursor.toArray();

    return result;

}
//rejected Employee ---> Functionality
const rejected_candidate = async (userId, jobid, userCollection, org_catagories) => {

    const filter = { _id: new ObjectId(userId) };
    const jobId = { id: new ObjectId(jobid) };
    const options = { upsert: true };
    let updateDoc;
    if (process.env.ORG_CATAGORIES === org_catagories) {
        updateDoc = { $pull: { Non_org_Interview: jobId } }

    }
    else {
        updateDoc = { $pull: { InterviewCall: jobId } }
    }

    const result = await userCollection.updateOne(filter, updateDoc, options);

    return { status: true, data: result };
}
//id searching with findOne Function
const findOne_by_Id = async (id, jobCollection) => {

    const query = { _id: new ObjectId(id) }
    const result = await jobCollection.findOne(query);

    return result;

}
//update Orginazitional And Non Orginazitional Job Collection

const update_job_collection = async (id, data, jobCollection) => {

    const filter = { _id: new ObjectId(id) }


    const options = { upsert: true };
    const Updatedata = {
        $set: {
            ...data
        }
    }

    const result = await jobCollection.updateOne(filter, Updatedata, options);
    return result;
}

//update Many which is the change everything at a time 

const update_all_information = async (filter, data, dataCollection) => {

    const options = { upsert: true };
    const Updatedata = {
        $set: {
            ...data
        }
    }
    const result = await dataCollection.updateMany(filter, Updatedata, options);
    return result;

}

//delete orginaztion and Non Orginaztion  Jod details
const delete_job_details = async (id, jobCollection) => {

    const query = { _id: new ObjectId(id) };
    const result = await jobCollection.deleteOne(query);
    return result;
}

module.exports = { duplicate_Interview_Checked, send_email_nodemaider, Interview_called_Information, Interview_List, rejected_candidate, findOne_by_Id, update_job_collection, delete_job_details, update_all_information }