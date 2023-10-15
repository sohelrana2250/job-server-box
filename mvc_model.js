const { ObjectId } = require("mongodb");

const getAll_data = async (query, dataCollection, Page = 0, Size = 0) => {

    const result = await dataCollection.find(query).skip(Page * Size).limit(Size).toArray();
    return result;

}

const get_by_email = async (query, dataCollection) => {

    const result = await dataCollection.findOne(query);
    return result;

}

const set_update_info = async (id, update_data, dataCollection) => {

    const filter = { _id: new ObjectId(id) };
    const options = { upsert: true };
    const updateDoc = {
        $set: update_data
    }

    const result = await dataCollection.updateOne(filter, updateDoc, options);

    return result;
}
const set_post_data = async (post_data, dataCollection) => {
    const post_result = await dataCollection.insertOne(post_data);
    return post_result;
}

//uploded information by the email searching 
const set_updateInfo_byEmail = async (email, update_data, dataCollection) => {

    const filter = { email };
    const options = { upsert: true };
    const updateDoc = {
        $set: update_data
    }

    const result = await dataCollection.updateOne(filter, updateDoc, options);

    return result;
}
//PUSH method in MondoDb

const setPushmethod = async (filter, updateDoc, updateCollection) => {

    const options = { upsert: true };
    const result = await updateCollection.updateOne(filter, updateDoc, options);


    return result;


}

module.exports = { getAll_data, get_by_email, set_update_info, set_post_data, set_updateInfo_byEmail, setPushmethod };
