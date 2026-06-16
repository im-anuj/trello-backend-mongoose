const mongoose = require('mongoose');

mongoose.connect('mongodb url here');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const UserSchema = new Schema({
  username: String,
  password: String
});

const OrganizationSchema = new Schema({
  title: String,
  description: String,
  admin: ObjectId,
  members: [ObjectId]
});

const BoardSchema = new Schema({
  title: String,
  organizationId: ObjectId
});

const IssueSchema = new Schema({
  title: String,
  boardId: ObjectId,
  state: String
});

const userModel = mongoose.model("USERS", UserSchema);
const organizationModel = mongoose.model("ORGANIZATION", OrganizationSchema);
const boardModel = mongoose.model("BOARDS", BoardSchema);
const issueModel = mongoose.model('ISSUES', IssueSchema);

module.exports = {
  userModel,
  organizationModel,
  boardModel,
  issueModel
}