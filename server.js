const express = require('express');
const jwt = require('jsonwebtoken');
const authMiddelware = require('./middleware');
const {userModel, organizationModel, boardModel, issueModel} = require('./models');

// let USERS_ID = 10;
// let ORGANIZATION_ID = 10;
// let BOARDS_ID = 10;
// let ISSUES_ID = 10;

// const USERS = [{
//   id: 1,
//   username: "anuj123",
//   password: "123123"
// }, {
//   id: 2,
//   username: "rahul",
//   password: "1231234"
// }];

// const ORGANIZATIONS = [{
//   id: 1,
//   title: "zomato",
//   description: "order food",
//   admin: 1,
//   members: [2]
// }, {
//   id: 2,
//   title: "org 2",
//   description: "org 2 description",
//   admin: 2,
//   members: []
// }];

// const BOARDS = [{
//   id: 1,
//   title: "zomato website frontend",
//   organizationId: 1
// }];

// const ISSUES = [{
//   id: 1,
//   title: "add dark mode",
//   boardId: 1,
//   state: "IN_PROGRESS" // "UP_NEXT" | "IN_PROGRESS" | "DONE" | "ARCHIVED"
// }, {
//   id: 2,
//   title: "add new feat",
//   boardId: 1,
//   state: "DONE"
// }];

const app = express();
const PORT = 3000;
app.use(express.json());

//CREATE

app.post('/signup', async(req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const userExists = await userModel.findOne({
    username: username
  });

  if(userExists){
    res.status(400).json({
      message: "User already exists"
    });
    return;
  }

  const newUser = await userModel.create({
    username,
    password
  });
  res.json({
    message: "Signup successful",
    id: newUser._id
  });
});

app.post('/signin', async(req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const newUser = await userModel.findOne({
    username: username,
    password: password
  })

  if(!newUser){
    res.status(401).json({
      message: "Invalid credentials"
    });
    return;
  }

  const token = jwt.sign({
    userId: newUser.id
  }, "secret1234");
  res.json(token);
});

app.post('/organization', authMiddelware, async(req, res) => {
  const userId = req.userId;
  const newOrg = await organizationModel.create({
    title: req.body.title,
    description: req.body.description,
    admin: userId,
    members: []
  });
  res.json({
    message: "org created",
    organizationId: newOrg._id
  });
});

app.post('/add-member-to-organization', authMiddelware, async(req, res) => {
  const userId = req.userId;
  const organizationId = req.body.organizationId;
  const memberUsername = req.body.memberUsername;

  const organization = await organizationModel.findOne({
    _id: organizationId
  });

  if( !organization || organization.admin.toString() !== userId){
    res.status(411).json({
      message: "either this org doesnt exists or you are not an admin of this org"
    });
    return;
  }

  const member = await userModel.findOne({
    username: memberUsername
  });

  if(!member){
    res.status(411).json({
      message: "no user with this username exists in our database"
    });
    return;
  }

  await organizationModel.updateOne({
    _id: organizationId
  }, {
    $addToSet: { //used $addToSet insted of $push to avoid duplication
      members: member._id
    }
  });
  //another way
  // organization.members.push(member._id);
  // await organization.save();

  res.json({
    message: "new member added"
  });
});

app.post('/board', authMiddelware, async(req, res)=> {
  const userId = req.userId;
  const organizationId = req.body.organizationId;

  const organization = await organizationModel.findOne({
    _id: organizationId
  })

  if(!organization){
    return res.status(404).json({
      message: "this org doesnt exists"
    });
  }
  if(organization.admin.toString() !== userId){
    return res.status(403).json({
      message: "only admin can create boards"
    });
  }

  const newBoard = await boardModel.create({
    title: req.body.title,
    organizationId: organizationId
  })
  res.json({
    message: "board created",
    boardId: newBoard._id
  });
});

app.post('/issue', authMiddelware, async(req, res) => {
  const userId = req.userId;
  const boardId = req.body.boardId;

  const board = await boardModel.findOne({
    _id: boardId
  });
  
  if(!board){
    return res.status(404).json({
      message: "board not found"
    });
  }

  const organization = await organizationModel.findOne({
    _id: board.organizationId
  });

  if(!organization){
    return res.status(404).json({
      message: "this org doesnt exists"
    });
  }

  const isMember = organization.admin.toString() === userId || 
                    organization.members.some(memberId => memberId.toString() === userId);
                    //.some() is a JavaScript array method that checks whether at least one 
                    // element in the array satisfies a condition.
                    
  if(!isMember){
    return res.status(403).json({
      message: "you are not a member of this org"
    });
  }

  const newIssue = await issueModel.create({
    title: req.body.title,
    boardId: boardId,
    state: "UP_NEXT"
  });

  res.json({
    message: "issue created",
    issueId: newIssue._id
  });
});


//GET endpoints
//READ

app.get('/organization', authMiddelware, async(req, res) => {
  const userId = req.userId;
  const organizationId = req.query.organizationId;

  const organization = await organizationModel.findOne({
    _id: organizationId
  })
  if(!organization){
    return res.status(404).json({
      message: "org doesnt exist"
    });
  }
  if(organization.admin.toString() !== userId){
    return res.status(403).json({
      message: "you are not the admin of this org"
    });
  }

  const members = await userModel.find({
    _id: organization.members
  });
  res.json({
    organization:{
      title: organization.title,
      description: organization.description,
      members: members.map(m => ({
        username: m.username,
        id: m._id
      }))
    }
  });
});

app.get('/my-organizations', authMiddelware, async(req, res) => {
  const userId = req.userId;

  const organizations = await organizationModel.find({
    $or: [
      {admin: userId},
      {members: userId}
    ]
  }).select("title description");

  res.json({
    organizations
  });
})

app.get('/boards', authMiddelware, async(req, res) => {
  const userId = req.userId;
  const organizationId = req.query.organizationId;

  const organization = await organizationModel.findOne({
    _id: organizationId
  });
  if(!organization){
    return res.status(404).json({
      message: "org doesnt exists"
    });
  }

  const isMember = organization.admin.toString() === userId ||
                    organization.members.some(memberId => memberId.toString() === userId);

  if(!isMember){
    return res.status(403).json({
      message: "you are not a member of this org"
    });
  }

  const boards = await boardModel.find({
    organizationId: organizationId
  });
  res.json({
    boards
  });
});

app.get('/issues', authMiddelware, async(req, res) => {
  const userId = req.userId;
  const boardId = req.query.boardId;

  const board = await boardModel.findById(boardId);
  if(!board){
    return res.status(404).json({
      message: "board not found"
    });
  }

  const organization = await organizationModel.findById(board.organizationId);
  if(!organization){
    return res.status(404).json({
      message: "org doesnt exists"
    });
  }

  const isMember = organization.admin.toString() === userId || 
                    organization.members.some(memberId => memberId.toString() === userId);

  if(!isMember){
    return res.status(403).json({
      message: "you are not a member of this org"
    });
  }

  const issues = await issueModel.find({
    boardId: boardId
  });
  res.json({
    issues
  });
});

app.get('/members', authMiddelware, async(req, res) => {
  const userId = req.userId;
  const organizationId = req.query.organizationId;

  const organization = await organizationModel.findById(organizationId);
  if(!organization){
    return res.status(404).json({
      message: "org doesnt exists"
    });
  }

  if(organization.admin.toString() !== userId){
    return res.status(403).json({
      message: "you are not the admin of this org"
    });
  }

  const members = await userModel.find({
    _id: organization.members
  }).select("username")
  res.json({
    members
  });
});

//UPDATE

app.put('/issue', authMiddelware, async(req, res) => {
  const userId = req.userId;
  const issueId = req.query.issueId;

  const issue = await issueModel.findById(issueId);
  if(!issue){
    return res.status(404).json({
      message: "issue not found"
    });
  }
  const board = await boardModel.findById(issue.boardId);
  if(!board){
    return res.status(404).json({
      message: "board not found"
    });
  }

  const organization = await organizationModel.findById(board.organizationId);
  if(!organization){
    return  res.status(404).json({
      message: "org not found"
    });
  }

  const isMember = organization.admin.toString() === userId ||
                    organization.members.some(memberId => memberId.toString() === userId);

  if(!isMember){
    return res.status(403).json({
      message: "you are not a member of this org"
    });
  }

  if (issue.state === "UP_NEXT") {
    issue.state = "IN_PROGRESS";
  } else if (issue.state === "IN_PROGRESS") {
    issue.state = "DONE";
  } else if (issue.state === "DONE") {
    issue.state = "ARCHIVED";
  } else {
    return res.status(400).json({
      message: "issue is already archived"
    });
  }

  await issue.save();

  res.json({
    message: "issue updated",
    issue
  });
});

//DELETE
app.delete('/members', authMiddelware, async(req, res) => {
  const userId = req.userId;
  const organizationId = req.body.organizationId;
  const memberUsername = req.body.memberUsername;

  const organization = await organizationModel.findById(organizationId);

  if(!organization){
    return res.status(404).json({
      message: "this org doesnt exists"
    });
  }
  if(organization.admin.toString() !== userId){
    return res.status(403).json({
      message: "only admin can remove members"
    });
  }

  const member = await userModel.findOne({
    username: memberUsername
  })

  if(!member){
    return res.status(404).json({
      message: "user not found"
    });
  }
  if(!organization.members.includes(member.id)){
    return res.status(404).json({
      message: "user is not a member of this org"
    });
  }

  await organizationModel.updateOne({
    _id: organizationId
  }, {
    $pull: {
      members: member._id
    }
  });
  return res.json({
    message: "member deleted"
  });
})

app.get('/', authMiddelware, (req, res) => {
  res.json('hi');
});

app.listen(PORT, () => {
  console.log("http://localhost:3000");
})