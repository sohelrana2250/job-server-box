const express = require('express')
const app = express()
const port = process.env.PORT || 5015;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const si = require('systeminformation');
const jwt = require('jsonwebtoken');
const useragent = require('express-useragent');
const macaddress = require('macaddress');
const os = require("os");
const nodemailer = require("nodemailer");
const { duplicate_Interview_Checked, send_email_nodemaider, Interview_called_Information, Interview_List, rejected_candidate, findOne_by_Id, update_job_collection, delete_job_details, update_all_information } = require('./Functional_Models');
const { getAll_data, get_by_email, set_update_info, set_post_data, set_updateInfo_byEmail, setPushmethod } = require('./mvc_model');
//socket package
const http = require("http");


//middlewere

app.use(cors());
app.use(express.json());
app.use(useragent.express());






//username:JOBManagementData
//paassword: WA1Pxw2ttbTdMa9h

// '5aa82f51dd7be90d4122eb77e82a001b3bf6dde4ab40761915ecd64fbc2836096a164f4224fedcbc50efbb1093d40a71ea534f884891c544065319cc4dfc6f3b'



// here is my project API : https://job-server-box.vercel.app
const uri = `mongodb+srv://${process.env.DATA_BASE_USERNAME}:${process.env.DATA_BASE_PASSWORD}@cluster0.wqhd5vt.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// client.connect(err => {
//   const collection = client.db("test").collection("devices");
//   // perform actions on the collection object
//   client.close();
// });

//console.log(process.env.ACCESS_TOKEN_SECRET);






function verifyJwt(req, res, next) {


    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.send({ status: 401, message: 'unauthorized-User' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {

        if (err) {
            return res.send({ status: 403, message: 'unauthorized-User' })
        }
        req.decoded = decoded;
        next();
    });

}


//....random array of object 
const shuffleArray = (array) => {
    const shuffledArray = [...array];
    for (let i = shuffledArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
    }
    return shuffledArray;
};

const Automated_deletejobs = (jobsCollections, userCollection, Non_Org_Jobs) => {
    const query = {
        I_date: { $lt: new Date().getTime() }

    };
    let updateDoc;
    let delete_InterviewDoc;

    const expireDocuments = getAll_data(query, jobsCollections);
    expireDocuments.then(async (result) => {
        const OnedayIncluded = result?.map(async (v) => {
            if (v?.I_date + 86400000 <= new Date().getTime()) {
                if (process.env.ORG_CATAGORIES === Non_Org_Jobs) {
                    updateDoc = { $pull: { Non_org_applicants: { id: v?._id } } };
                    delete_InterviewDoc = { $pull: { Non_org_Interview: { id: v?._id } } }
                }
                else {
                    updateDoc = { $pull: { applicants: { id: v?._id } } };
                    delete_InterviewDoc = { $pull: { InterviewCall: { id: v?._id } } }

                }

                v?.applicants?.map(async (v) => {
                    await userCollection.updateOne({ _id: v?.id }, updateDoc, { upsert: true });
                    await userCollection.updateOne({ _id: v?.id }, delete_InterviewDoc, { upsert: true });


                })
                return v;
            }
        });

        Promise.all(OnedayIncluded).then(async (resolvedPromises) => {
            await jobsCollections.deleteMany({ _id: { $in: resolvedPromises.map(doc => doc?._id) } });


        }).catch((error) => {
            console.log(error?.message);
        });
    }).catch((error) => {
        console.log(error?.message);
    });


}

// socket 
const server = http.createServer(app);



async function run() {

    const userCollection = client.db("JobCollection").collection("user");
    const candidateuserCollection = client.db("JobCollection").collection("candidateUser");
    const jobCollection = client.db("JobCollection").collection("job");
    const categoriejobCollection = client.db("JobCollection").collection("jobCategorie");
    //specific-job-catagories collection
    const sepecificjobCollection = client.db("JobCollection").collection("sepecificjob");
    // user device information
    const deviceusesCollection = client.db("JobCollection").collection("devices");
    //vedio Content-Uploding database
    const contentCollection = client.db("JobCollection").collection("vedioContent");
    // compalin data 
    const complainCollection = client.db("JobCollection").collection("complainBox");
    Automated_deletejobs(jobCollection, candidateuserCollection, "Non_ORG");
    Automated_deletejobs(sepecificjobCollection, candidateuserCollection, "ORG");


    try {




        app.get('/', (req, res) => {

            res.send('Hello Job-server-box');
        });

        app.post('/user', async (req, res) => {

            const data = req.body;
            const employeerData = set_post_data(data, userCollection);
            employeerData.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            })
            // const result = await userCollection.insertOne(data);
            // res.send({ status: true, data: result });
        });

        //getUser information ---

        app.get("/user/:email", async (req, res) => {

            const email = req.params.email;

            ///console.log(email);
            const query = { email };
            const find_email = get_by_email(query, userCollection);
            find_email.then((result) => {
                return res.send(result);
            }).catch((error) => {
                console.log(error?.message);
            });


        });
        //update User Information
        app.put('/employeer_update_information', async (req, res) => {

            const data = req.body;
            const updateRegisterInfo = update_job_collection(data.id, data, userCollection);
            updateRegisterInfo.then((result) => {
                return res.send({ status: true, data: result })
            }).catch((error) => {
                console.log(error?.message);
            });
        });
        app.delete('/employeer_And_Candidate_ACCount/:id', async (req, res) => {

            const data = req.params.id;
            const id = data.split(' ')[0];
            const catagories = data.split(' ')[1];
            if (catagories === "candidate") {
                const deleteCanAndEmp = delete_job_details(id, candidateuserCollection);
                deleteCanAndEmp.then((result) => {

                    return res.send({ status: true, data: result });

                }).catch((error) => {
                    console.log(error?.message);
                });
            }
            else {
                const deleteCanAndEmp = delete_job_details(id, userCollection);
                deleteCanAndEmp.then((result) => {

                    return res.send({ status: true, data: result });

                }).catch((error) => {
                    console.log(error?.message);
                });
            }

        });
        app.get('/dashboard/all_employer', async (req, res) => {

            const query = {};
            const all_employee = getAll_data(query, userCollection);
            all_employee.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                return res.send({ status: false, message: `Error 403 - ${error?.message}` });
            })

        })

        //admin create 

        app.patch('/user/admin/:id', verifyJwt, async (req, res) => {

            const id = req.params.id;
            const admin = req.body.isAdmin;
            const date = req.body.date;
            const decoded_Email = req.decoded.email;
            const query = { email: decoded_Email };
            const find_email = get_by_email(query, userCollection);
            find_email.then((user) => {

                if (user.isAdmin) {
                    const updateDoc = {
                        isAdmin: admin,
                        c_date: date,
                        c_admin: decoded_Email
                    }
                    const update_doc = set_update_info(id, updateDoc, userCollection);
                    update_doc.then((result) => {
                        return res.send({ status: true, data: result });
                    }).catch((error) => {
                        console.log((error?.message))
                    })
                }
                else {
                    return res.status(403).send({ status: false, message: "forbidden Access " })
                }

            }).catch((error) => {
                console.log(error?.message);
            });
        });

        app.get("/users/admin/:email", async (req, res) => {

            const email = req.params.email;
            const query = { email };
            const find_email = get_by_email(query, userCollection);
            find_email.then((result) => {
                return res.send({ isAdmin: result?.isAdmin });
            }).catch((error) => {
                console.log(error?.message);
            });
        })


        //get-All Candidate User with admin
        app.get("/AllcandidateUser/admin", async (req, res) => {

            const query = {};
            const all_candidate = getAll_data(query, candidateuserCollection);
            all_candidate.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            })
        })
        //candidaate-user-post 

        app.post('/candidateUser', async (req, res) => {
            const data = req.body;
            const post_result = set_post_data(data, candidateuserCollection);
            post_result.then((result) => {
                return res.send(result);
            }).catch((error) => {
                consol.log(error?.message)
            });
        });

        //getCandidate-user 
        app.get("/candidateUser/:email", async (req, res) => {

            const email = req.params.email;
            const query = { email };
            const find_email = get_by_email(query, candidateuserCollection);
            find_email.then((result) => {
                return res.send(result);
            }).catch((error) => {
                console.log(error?.message);
            });
            //const result = await candidateuserCollection.findOne({ email });
            // console.log(result);
            //res.send(result);


        });

        //job post 

        app.post("/jobs", async (req, res) => {
            const job = req.body;
            const post_result = set_post_data(job, jobCollection);
            post_result.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                consol.log(error?.message)
            });
        });

        //get-job-data

        app.get('/jobs/:pagination', async (req, res) => {

            const pagination = req.params.pagination;
            const Size = parseInt(pagination.split(" ")[0]);
            const Page = parseInt(pagination.split(" ")[1]);
            const query = {};
            const all_Non_Orgjob = getAll_data(query, jobCollection, Page, Size);
            all_Non_Orgjob.then((result) => {
                const shuffledItems = shuffleArray(result);
                return res.send({ status: true, data: shuffledItems });
            }).catch((error) => {
                console.log(error?.message);
            });
        })
        //get-job-specific 

        app.get("/job-details/:id", verifyJwt, async (req, res) => {
            const id = req.params.id;
            const findone_byId = findOne_by_Id(id, jobCollection);
            findone_byId.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error);
            });
        });


        //job-apply-data

        app.patch("/apply", async (req, res) => {
            const userId = req.body.userId;
            const jobId = req.body.jobId;
            const email = req.body.email;
            const companyName = req.body.companyName;
            const position = req.body.position;
            const c_email = req.body.c_email;
            const experience = req.body.experience;
            const c_location = req.body.c_location;



            const query = { _id: new ObjectId(jobId) };
            const deplicate = await jobCollection.findOne(query);

            const checked = deplicate?.applicants?.find((v) => v.email === email);

            if (checked) {
                return res.send({ status: false, data: 'You already applied the job' });

            }

            const filter = { _id: new ObjectId(jobId) };
            const updateDoc = {
                $push: { applicants: { id: new ObjectId(userId), email } },
            };

            const candidateFilter = { _id: new ObjectId(userId) };
            const candidateupdateDoc = {
                $push: { Non_org_applicants: { id: new ObjectId(jobId), email, companyName, position, c_email, experience, c_location } },
            };
            const result1 = await candidateuserCollection.updateOne(candidateFilter, candidateupdateDoc);

            const result = await jobCollection.updateOne(filter, updateDoc);

            res.send({ status: true, data: { result, result1 } });
        });

        //get-Job-Apply Data
        app.get("/applied-jobs/:email", verifyJwt, async (req, res) => {

            const email = req.params.email;
            const decoded = req.decoded;
            if (decoded.email !== email) {

                res.send({ status: 403, message: 'unauthorized access' })

            }
            const query = { applicants: { $elemMatch: { email: email } } };
            const cursor = jobCollection.find(query).project({ applicants: 0 });
            const result = await cursor.toArray();
            res.send({ status: true, data: result });
        });

        //get-job-applicenats information
        app.get('/job-applicenats/:email', async (req, res) => {

            const email = req.params.email;
            const query = { email }
            const result = await jobCollection.find(query).project({

                overview: 0,
                skills: 0,
                responsibilities: 0,
                requirements: 0,
                queries: 0,
                applicants: 0

            }).toArray();
            res.send({ status: true, data: result });
        })


        //question---post  ----information ----

        app.patch("/query", async (req, res) => {
            const userId = req.body.userId;
            const jobId = req.body.jobId;
            const email = req.body.email;
            const question = req.body.question;
            const queId = req.body.queId



            const filter = { _id: new ObjectId(jobId) };
            const updateDoc = {
                $push: {
                    queries: {
                        id: new ObjectId(userId),
                        email,
                        queId,
                        question: question,
                        reply: [],
                    },
                },
            };

            const result = await jobCollection.updateOne(filter, updateDoc);


            if (result?.acknowledged) {
                return res.send({ status: true, data: result });
            }

            res.send({ status: false });
        });

        // set-reply the question Answer

        app.patch("/reply", async (req, res) => {

            const jobId = req.body._id
            const userId = req.body.id;
            const reply = req.body.reply;
            const queId = req.body.queId;
            //console.log(req.body);

            const filter = {
                _id: new ObjectId(jobId)
            };

            const updateDoc = {
                $push: {
                    "queries.$[user].reply": { queId, reply },
                },
            };
            const arrayFilter = {
                arrayFilters: [{ "user.id": new ObjectId(userId) }],
            };

            const result = await jobCollection.updateOne(
                filter,
                updateDoc,
                arrayFilter
            );
            if (result.acknowledged) {
                return res.send({ status: true, data: result });
            }

            res.send({ status: false });



        });

        //replay-delete section 

        app.delete("/reply-delete", async (req, res) => {

            const data = req.body;
            const job_id = data.job_id;
            const queId = data.id;

            const filter = { _id: new ObjectId(job_id) };
            const result = await jobCollection.updateOne(filter, {
                $pull: {
                    queries: {
                        reply: { $elemMatch: { queId } }
                    }
                }
            });

            res.send({ status: true, data: result });




        });

        //-----------the journey started with categories list to exprince personality 

        app.post('/jobCategories', async (req, res) => {

            const data = req.body;
            const email = req.email;
            const catagories = req.catagories;
            const query = { email };
            const result = await categoriejobCollection.find(query).toArray();
            const search = result.find((v) => v.catagories === catagories);
            if (result.length < 4 && search === undefined) {
                // const categoriesResult = await categoriejobCollection.insertOne(data);

                const cataResult = set_post_data(data, categoriejobCollection);
                cataResult.then((result) => {
                    return res.send({ status: true, data: result });
                }).catch((error) => {
                    console.log(error?.message);
                })
            }
            else if (search.catagories === data.catagories) {
                return res.send({ status: false, message: "Catagories allready exist" });
            }
            else {
                return res.send({ status: false, message: "Your Catagories Limit Full" })
            }
        })




        //get----categories ---job data

        app.get('/job-Catagores-info/:catagories', async (req, res) => {

            const catagorie = req.params.catagories;
            let query = {};
            if (catagorie !== 'none') {
                query = { catagories: catagorie };
            }
            else {
                query = {};
            }
            const company_job_catagories = getAll_data(query, categoriejobCollection);
            company_job_catagories.then((result) => {
                const shuffledItems = shuffleArray(result);
                res.send({ status: true, data: shuffledItems });
            }).catch((error) => {
                console.log(error?.message);
            })
        })

        //get----find---catagories list with user end (email)

        app.get('/job-Catagores/:email', verifyJwt, async (req, res) => {


            const email = req.params.email;
            const decoded = req.decoded;
            if (decoded.email !== email) {

                return res.send({ status: 403, message: 'unauthorized access' })

            }
            const query = { email: email };
            const findbyEmail = getAll_data(query, categoriejobCollection);
            findbyEmail.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            });
        })
        //get----sepecific catagories information with update

        app.get('/getUpdateCataInfo/:id', verifyJwt, async (req, res) => {

            const id = req.params.id;
            const findone_byId = findOne_by_Id(id, categoriejobCollection);
            findone_byId.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error);
            })
        })

        //update-----sepecific catagories information 

        app.put('/Update-Cate-Info/:id', verifyJwt, async (req, res) => {

            const id = req.params.id;
            const productData = req.body;
            const updatecatagories = update_job_collection(id, productData, categoriejobCollection);
            updatecatagories.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            })
        });

        //----post ---catagories----data 

        app.post('/specific-catagorie', async (req, res) => {

            const data = req.body;
            const post_result = set_post_data(data, sepecificjobCollection);
            post_result.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            })
        })

        //----get----specific catagories 
        app.get('/specific-catagorie-list/:id', async (req, res) => {

            const id = req.params.id;
            const query = { id };
            const findbyId = getAll_data(query, sepecificjobCollection);
            findbyId.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            })
        });
        //---get .....details-job-info....by the specific id

        app.get('/details-job-info/:id', verifyJwt, async (req, res) => {

            const id = req.params.id;
            const findone_byId = findOne_by_Id(id, sepecificjobCollection);
            findone_byId.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error);
            })

        });

        //catagories-job-apply the patch 
        app.patch("/catagorie-job-apply", async (req, res) => {

            const userId = req.body.userId;
            const jobId = req.body.jobId;
            const email = req.body.email;
            const companyName = req.body.companyName;
            const position = req.body.position;
            const c_email = req.body.c_email;
            const experience = req.body.experience;
            const c_location = req.body.c_location;

            const query = { _id: new ObjectId(jobId) };
            const deplicate = await sepecificjobCollection.findOne(query);
            const checked = deplicate?.applicants?.find((v) => v.email === email);
            if (checked) {
                return res.send({ status: false, data: 'You already applied the job' });

            }
            const filter = { _id: new ObjectId(jobId) };
            const updateDoc = {
                $push: { applicants: { id: new ObjectId(userId), email } },
            };

            const candidateFilter = { _id: new ObjectId(userId) };
            const candidateupdateDoc = {
                $push: { applicants: { id: new ObjectId(jobId), email, companyName, position, c_email, experience, c_location } },
            };
            const result1 = await candidateuserCollection.updateOne(candidateFilter, candidateupdateDoc);

            const result = await sepecificjobCollection.updateOne(filter, updateDoc);
            res.send({ status: true, data: { result, result1 } });
        });

        //update ----catagoriesdata 

        app.get('/get-catagories-data/:email', async (req, res) => {

            const email = req.params.email;
            const query = { email };
            const result = await sepecificjobCollection.find(query).project({
                overview: 0,
                skills: 0,
                responsibilities: 0,
                requirements: 0
            }).toArray();
            res.send({ status: true, data: result });
        });

        //getAll_Orginazition Job List
        app.get('/all_orgJobsList', async (req, res) => {

            const query = {};
            const alljobs = getAll_data(query, sepecificjobCollection);
            alljobs.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            })
        });


        //update---catagories----job----information
        app.put('/update-companys-catagories/:id', async (req, res) => {


            const jobId = req.params.id;
            const id = jobId.split(' ')[0];
            const org_catagories = jobId.split(' ')[1];
            const data = req.body;

            if (process.env.ORG_CATAGORIES === org_catagories) {
                const non_org_collection = update_job_collection(id, data, jobCollection);
                non_org_collection.then((result) => {
                    return res.send({ status: true, data: result });
                }).catch((error) => {
                    return res.send({ status: false, message: `Server Error 404 ${error?.message}` });
                })
            }
            else {
                const non_org_collection = update_job_collection(id, data, sepecificjobCollection);
                non_org_collection.then((result) => {

                    return res.send({ status: true, data: result });
                }).catch((error) => {
                    return res.send({ status: false, message: `Server Error 404 ${error?.message}` });
                })
            }
        });

        //specific-company-catagories----candiddate---chatbot

        app.patch("/question-and-reply", async (req, res) => {
            const userId = req.body.userId;
            const jobId = req.body.jobId;
            const email = req.body.email;
            const question = req.body.question;
            const queId = req.body.queId

            const filter = { _id: new ObjectId(jobId) };
            const updateDoc = {
                $push: {
                    queries: {
                        id: new ObjectId(userId),
                        email,
                        queId,
                        question: question,
                        reply: [],
                    },
                },
            };

            const result = await sepecificjobCollection.updateOne(filter, updateDoc);

            if (result?.acknowledged) {
                return res.send({ status: true, data: result });
            }
            res.send({ status: false });
        });

        //reply-------each and every---question with company catagories employee

        app.patch("/catagories-reply", async (req, res) => {
            const jobId = req.body._id
            const userId = req.body.id;
            const reply = req.body.reply;
            const queId = req.body.queId;

            const filter = {
                _id: new ObjectId(jobId)
            };

            const updateDoc = {
                $push: {
                    "queries.$[user].reply": { queId, reply },
                },
            };
            const arrayFilter = {
                arrayFilters: [{ "user.id": new ObjectId(userId) }],
            };

            const result = await sepecificjobCollection.updateOne(
                filter,
                updateDoc,
                arrayFilter
            );
            if (result.acknowledged) {
                return res.send({ status: true, data: result });
            }

            res.send({ status: false });
        });

        //applied user job diashboard------only---candidate----show
        app.get("/compay-applied-jobs/:email", verifyJwt, async (req, res) => {

            const email = req.params.email;

            const decoded = req.decoded;
            if (decoded.email !== email) {

                res.send({ status: 403, message: 'unauthorized access' })

            }


            const query = { applicants: { $elemMatch: { email: email } } };
            const cursor = sepecificjobCollection.find(query).project({ applicants: 0, });
            const result = await cursor.toArray();
            res.send({ status: true, data: result });
        });

        //....delete-----chatbot----information next 


        app.delete('/delete-catagories-chat', async (req, res) => {

            const data = req.body;
            const job_id = data._id;
            const queId = data.queId


            const filter = { _id: new ObjectId(job_id) };
            const result = await sepecificjobCollection.updateOne(filter, {
                $pull: {
                    queries: {
                        reply: { $elemMatch: { queId } }
                    }
                }
            });

            res.send({ status: true, data: result });


        });


        //....delete----operation.....catagories...job...applicants

        app.delete('/delete-catagories-job', async (req, res) => {

            const data = req.body;
            const org_catagories = data?.JobType;
            const id = data?.id;
            if (process.env.ORG_CATAGORIES === org_catagories) {
                const delete_job = delete_job_details(id, jobCollection);
                delete_job.then((result) => {
                    res.send({ status: true, data: result });
                }).catch((error) => {
                    console.log(error?.message);
                })

            }
            else {
                const delete_job = delete_job_details(id, sepecificjobCollection);
                delete_job.then((result) => {
                    res.send({ status: true, data: result });
                }).catch((error) => {
                    console.log(error?.message);
                })
            }
        });


        //....store the user device information 

        app.post('/post-device-information', async (req, res) => {



            const data = req.body;
            const query = { email: data.email };
            const find_email = get_by_email(query, deviceusesCollection);
            const deviceName = os.hostname();
            const versonName = os.version();
            const macAddresses = macaddress.all();
            macAddresses.then((address) => {
                find_email.then((result) => {
                    if (result?.mac_address === address?.CloudflareWARP?.mac) {
                        return res.send({ status: false, message: 'your Information is Exist' });
                    }
                    else {

                        const post_data = {
                            ...data,
                            deviceName,
                            versonName,
                            mac_address: address.CloudflareWARP.mac,
                            disable: false
                        }
                        const post_collection = set_post_data(post_data, deviceusesCollection);
                        post_collection.then((post_result) => {
                            return res.send({ status: true, data: post_result });
                        }).catch((error) => {
                            console.log(error?.message);
                        });
                    }
                }).catch((error) => {
                    console.log(error?.message);
                })

            }).catch((error) => {
                console.log(error?.message);
            })
        });

        //get user-----device----information ------UserProfile.js file

        app.get('/get-Device-Information/:email', async (req, res) => {

            const email = req.params.email;
            const query = { email: email };
            const deviceInfo = getAll_data(query, deviceusesCollection)
            deviceInfo.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log((error?.message));
            });
        });

        //...get ----candidate----information-----(update)

        app.get('/get-candidate-Info/:email', async (req, res) => {

            const email = req.params.email;
            const query = { email: email };
            const specific_candidate = get_by_email(query, candidateuserCollection);
            specific_candidate.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            })
        });

        app.patch('/update-device-infomation/:email', async (req, res) => {

            const email = req.params.email;
            const data = req.body;
            const query = { email: email };
            const find_email = get_by_email(query, deviceusesCollection);
            find_email.then((result) => {
                if (result.email === email) {

                    const update_by_email = set_updateInfo_byEmail(email, data, deviceusesCollection);
                    update_by_email.then((result) => {
                        return res.send({ status: true, data: result });
                    }).catch((error) => {
                        console.log(error?.message);
                    })
                }
                else {
                    return res.send({ status: false, message: "Email Not Found" });
                }
            }).catch((error) => {
                console.log(error?.message);
            })


        });

        //get All device Info

        app.get("/all_user_and_device_info", async (req, res) => {

            const query = {};
            const all_device = getAll_data(query, deviceusesCollection);
            all_device.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                return res.send({ status: false, message: error?.message });
            })

        });
        //disable user Account using deviceCollection
        app.patch("/is_it_disable_Account/:email", async (req, res) => {

            const email = req.params.email;
            const data = req.body;
            const filter = { email: email }
            const email_selected_user = update_all_information(filter, data, deviceusesCollection);
            email_selected_user.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                return res.send({ status: false, message: error?.message });
            })
        });

        app.put('/update-candidate-Info/:id', async (req, res) => {

            const id = req.params.id;
            const data = req.body;

            const update = update_job_collection(id, data, candidateuserCollection)
            update.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            })
        });

        //.....employeer job-----sending message
        app.patch('/InterviewCall', async (req, res) => {

            const userId = req.body.userId;
            const email = req.body.email;
            const JobId = req.body.JobId;
            const email_body = req.body.email_body;
            const companyName = req.body.companyName;
            const org_catagories = req.body.org_catagories;
            const employeer_email = req.body.employeer_email;
            //console.log(req.body);
            if (org_catagories === process.env.ORG_CATAGORIES) {

                let sd = duplicate_Interview_Checked(userId, candidateuserCollection, JobId, org_catagories)
                sd.then((result) => {
                    if (result) {
                        return res.send({ status: false, message: 'you have already send Email' });
                    }
                    // console.log("The Next Line code you can started");
                    let info = send_email_nodemaider(email, email_body, companyName);
                    info.then((info) => {
                        const interview = Interview_called_Information(userId, JobId, employeer_email, candidateuserCollection, org_catagories, companyName);
                        interview.then((result) => {
                            return res.send({ status: true, email_send: { message: info.messageId, mail_message: nodemailer.getTestMessageUrl(info) }, data: result });
                        }).catch((error) => {
                            console.log(error);
                        })
                    }).catch((error) => {
                        console.log(error);
                    })
                }).catch((error) => {
                    console.log(error?.message)
                })

            }
            else {

                let sd = duplicate_Interview_Checked(userId, candidateuserCollection, JobId, org_catagories)
                sd.then((result) => {
                    if (result) {
                        return res.send({ status: false, message: 'you have already send Email' });
                    }
                    // console.log("The Next Line code you can started");
                    let info = send_email_nodemaider(email, email_body, companyName);
                    info.then((info) => {
                        const interview = Interview_called_Information(userId, JobId, employeer_email, candidateuserCollection, org_catagories, companyName);
                        interview.then((result) => {
                            return res.send({ status: true, email_send: { message: info.messageId, mail_message: nodemailer.getTestMessageUrl(info) }, data: result });
                        }).catch((error) => {
                            console.log(error);
                        })
                    }).catch((error) => {
                        console.log(error);
                    })
                }).catch((error) => {
                    console.log(error?.message)
                })
            }
        });

        //content base Job Interview Section 

        app.patch("/content_basejob_Interview", async (req, res) => {

            const data = req.body;
            const name = data.name;
            const emp_email = data.emp_email;
            const companyName = "JOBBOX.com"
            const emailBody = `Hello, Dear Candidate, I see you video resume, is very impresive  and We Would like to interview you.Interview details will be emailed to you. You Will get the Information of our company,Jobbox Applicaion
           My Name is ${name} and Here is My Email Address ${emp_email}
           `
            let updateDoc = {
                $push: { c_b_Interview: { id: new ObjectId().toString(), email: data.emp_email } },
            };

            const filter = { _id: new ObjectId(data?.candidate_Id) };
            const duplicate = get_by_email(filter, contentCollection);
            duplicate.then((result) => {

                const isExist = result?.c_b_Interview?.find((v) => v?.email === emp_email);
                if (isExist) {
                    return res.send({ status: false, message: "you have already send Email" })
                }
                //if condition is false then next Line is Continue
                let info = send_email_nodemaider(data?.candate_email, emailBody, companyName);
                info.then((info) => {
                    //.. email sending information store in the Mongodb database 
                    const contentJob = setPushmethod(filter, updateDoc, contentCollection);
                    contentJob.then((database_result) => {

                        return res.send({ status: true, email_send: { message: info.messageId, mail_message: nodemailer.getTestMessageUrl(info) }, data: database_result });

                    }).catch((error) => {
                        console.log(error?.message);
                    })
                }).catch((error) => {
                    console.log(error?.message);
                })
            }).catch((error) => {
                console.log(error?.message);
            })
        });

        app.get('/ListOf-InterviewCalled/:id', verifyJwt, async (req, res) => {

            const id = req.params.id;
            const userId = id.split(' ')[0];
            const org_catagories = id.split(' ')[1];

            const list_of_interview = Interview_List(userId, candidateuserCollection, org_catagories);

            list_of_interview.then((result) => {

                return res.send({ status: true, data: result });

            }).catch((error) => {
                console.log(error);
            })

        });

        //orginazitional Job List

        app.get('/ListOf-ApplicantUser/:id', verifyJwt, async (req, res) => {

            const id = req.params.id;
            const query = { applicants: { $elemMatch: { id: new ObjectId(id) } } };
            const cursor = candidateuserCollection.find(query).project({
                InterviewCall: 0, role: 0, applicants: 0, Non_org_applicants: 0
            });
            const result = await cursor.toArray();

            res.send({ status: true, data: result });

        });
        //Non-orginazitional Job List

        app.get('/ListOf_Non_Org_ApplicantUser/:id', verifyJwt, async (req, res) => {

            const id = req.params.id;
            const query = {
                Non_org_applicants
                    : { $elemMatch: { id: new ObjectId(id) } }
            };
            const cursor = candidateuserCollection.find(query).project({
                InterviewCall: 0, role: 0, applicants: 0, Non_org_applicants: 0
            });
            const result = await cursor.toArray();
            res.send({ status: true, data: result });

        })

        //un-selected employee removing process
        app.put('/unselected-employee', verifyJwt, async (req, res) => {

            // console.log(req.body);
            const userId = req.body.userid;
            const jobid = req.body.jobid;
            const org_catagories = req.body.org_catagories;

            const rejected = rejected_candidate(userId, jobid, candidateuserCollection, org_catagories)
            rejected.then((result) => {

                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error);
            });
        })


        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        });

        // vedio content-uploding 
        app.post('/vedioContent', async (req, res) => {

            const user_data = req.body;
            const postVideo = set_post_data(user_data, user_data);
            postVideo.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            })
            // const result = await contentCollection.insertOne(user_data);
            // //console.log(result);
            // res.send({ status: true, data: result });

        });
        //video-content-display
        app.get('/content-Display', verifyJwt, async (req, res) => {

            const search = req.query.search;
            let query = {};
            if (search.length) {
                query = { job_catagories: search };
            }

            const content_all_job = getAll_data(query, contentCollection);
            content_all_job.then((result) => {
                const shuffledItems = shuffleArray(result);
                return res.send({ status: true, data: shuffledItems });
            }).catch((error) => {
                console.log(error?.message);
            })
        })

        //specific video conetent display with Email

        app.get("/get_specfic_content/:email", verifyJwt, async (req, res) => {

            const email = req.params.email;
            const decoded = req.decoded;
            if (decoded.email !== email) {
                res.send({ status: 403, data: 'unauthorized access' })
            }
            const query = { email: email };
            const specificCandidate = getAll_data(query, contentCollection);
            specificCandidate.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            });
        });

        //employee selected list 
        app.get("/employee_selected_content/:email", async (req, res) => {

            const query = {
                c_b_Interview: { $elemMatch: { email: req.params.email } }
            };
            const selectedContent = getAll_data(query, contentCollection);
            selectedContent.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            })
        })

        //specifc video content Update with get_By_ID

        app.get('/update_specific_jobpost/:id', verifyJwt, async (req, res) => {

            const id = req.params.id;
            const content_data = findOne_by_Id(id, contentCollection);
            content_data.then((result) => {
                res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            })
        })

        //update  information
        app.put("/update-ccontentbase-jobpost/:id", verifyJwt, async (req, res) => {

            const id = req.params.id;
            const data = req.body;
            const content_update = update_job_collection(id, data, contentCollection);
            content_update.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log((error?.message));
            })
        })
        //contentt -detete by ID section 
        app.delete('/delete_contentbase_jobpost/:id', verifyJwt, async (req, res) => {

            const id = req.params.id;
            const deleteContent = delete_job_details(id, contentCollection);
            deleteContent.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            })

        });

        //eployeer rating process
        app.put('/rating_count', async (req, res) => {

            const data = req.body;
            const update_doc = {
                rating: data.sum,
                count: data.count,
                Avg_rating: data.Avg_percent
            }
            const rating_set = set_update_info(data.productId, update_doc, contentCollection);
            rating_set.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            })
        })

        //specific user contact information gathering process

        app.put("/specific_user_contact/:id", async (req, res) => {

            const id = req.params.id;
            const data = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $push: { contact_Info: data },
            };
            const updateContent = setPushmethod(filter, updateDoc, contentCollection);
            updateContent.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            });


        });


        //delete specific user contact  information
        app.delete('/delete_contact_info', async (req, res) => {


            const data = req.body;

            const filter = { _id: new ObjectId(data?.id) };

            const contact_Id = { contact_id: data.contact_id };
            const updateDoc = { $pull: { contact_Info: contact_Id } };
            const deleteContent = setPushmethod(filter, updateDoc, contentCollection);
            deleteContent.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            })

        });

        // post complain Information

        app.put('/complain_details/:email', async (req, res) => {

            const email = req.params.email;
            const data = req.body;

            const filter = { email }
            let updateDoc;

            if (data?.typeofCondition === process.env.COMPLAIN_CANTOEMP) {
                Reflect.deleteProperty(data, "typeofCondition");

                updateDoc = {

                    $push: { CanToEmp: { id: new ObjectId().toString(), data } }
                }
            }
            else if (data?.typeofCondition === process.env.COMPALIN_SYSTEM_ISSUES) {
                Reflect.deleteProperty(data, "typeofCondition");
                updateDoc = {

                    $push: { Sys_Com: { id: new ObjectId().toString(), data } }
                }

            }
            else if (data?.typeofCondition === process.env.COMPLAIN_CANDIDATE_TO_EMPLOYEER) {
                Reflect.deleteProperty(data, "typeofCondition");
                updateDoc = {

                    $push: { C_to_E: { id: new ObjectId().toString(), data } }
                }
            }
            else if (data?.typeofCondition === process.env.COMPLAIN_EMPLOYEER_TO_CANDIDATE) {
                Reflect.deleteProperty(data, "typeofCondition");
                updateDoc = {

                    $push: { E_to_C: { id: new ObjectId().toString(), data } }
                }
            }


            else {
                Reflect.deleteProperty(data, "typeofCondition");
                updateDoc = {

                    $push: { EmpToCan: { id: new ObjectId().toString(), data } }
                }
            }

            const complainBox = setPushmethod(filter, updateDoc, complainCollection);
            complainBox.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            });

        });

        //all complain list ----> onlay access admin 

        app.get('/all_complain_list', async (req, res) => {
            const query = {};
            const all_list = getAll_data(query, complainCollection);
            all_list.then((result) => {

                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            })

        });

        //delete specific complain information 440
        app.delete("/delete_specific_complain", async (req, res) => {

            const data = req.body;
            const specificId = { id: data?.s_complainId };
            let updateDoc;
            let filter;
            switch (data?.complainName) {
                case process.env.COMPLAIN_CANTOEMP: {
                    filter = { _id: new ObjectId(data?.complainId) };
                    updateDoc = {
                        $pull: {
                            CanToEmp
                                : specificId
                        }
                    };
                }; break;
                case process.env.COMPALIN_SYSTEM_ISSUES: {
                    filter = { _id: new ObjectId(data?.complainId) };
                    updateDoc = { $pull: { Sys_Com: specificId } };
                }; break;
                case process.env.COMPLAIN_CANDIDATE_TO_EMPLOYEER: {
                    filter = { _id: new ObjectId(data?.complainId) };
                    updateDoc = { $pull: { C_to_E: specificId } };
                }; break;
                case process.env.COMPLAIN_EMPLOYEER_TO_CANDIDATE: {
                    filter = { _id: new ObjectId(data?.complainId) };
                    updateDoc = { $pull: { E_to_C: specificId } };
                }; break;
                case process.env.COMPLAIN_EMP_TO_CAN: {
                    filter = { _id: new ObjectId(data?.complainId) };
                    updateDoc = { $pull: { EmpToCan: specificId } };
                }; break;
                default: {
                    console.log("Poor Cooding Issues ,Server can't working");
                }

            }
            const specificComplinRemove = setPushmethod(filter, updateDoc, complainCollection);
            specificComplinRemove.then((result) => {
                return res.send({ status: true, data: result });
            }).catch((error) => {
                console.log(error?.message);
            });
        });
    }
    finally {

    }
}

run().catch((error) => {
    console.log(error.messsage);
})


server.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})