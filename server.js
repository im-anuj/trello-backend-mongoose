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

app.get('/organization', authMiddelware, (req, res) => {
  const userId = req.userId;
  const organizationId = parseInt(req.query.organizationId);

  const organization = ORGANIZATIONS.find(org => org.id === organizationId);
  if(!organization){
    return res.status(404).json({
      message: "org doesnt exist"
    });
  }
  if(organization.admin !== userId){
    return res.status(403).json({
      message: "you are not the admin of this org"
    });
  }

  res.json({
    organization: {
      ...organization,
      members: organization.members.map(memberId => {
        const user = USERS.find(u => u.id === memberId);
        return{
          id: user.id,
          username: user.username
        }
      })
    }
  });
});

app.get('/my-organizations', authMiddelware, (req, res) => {
  const userId = req.userId;
  
  const organizations = ORGANIZATIONS.filter(org => 
    org.admin === userId || org.members.includes(userId)
  )
  .map((org) => {
    return {
      id: org.id,
      title: org.title,
      description: org.description
    }
  });

  res.json({
    organizations
  });
})

app.get('/boards', authMiddelware, (req, res) => {
  const userId = req.userId;
  const organizationId = parseInt(req.query.organizationId);

  const organization = ORGANIZATIONS.find(org => org.id === organizationId);
  if(!organization){
    return res.status(404).json({
      message: "org doesnt exists"
    });
  }

  const isMember = organization.admin === userId ||
                    organization.members.includes(userId);

  if(!isMember){
    return res.status(403).json({
      message: "you are not a member of this org"
    });
  }

  const boards = BOARDS.filter(b => b.organizationId === organizationId);
  res.json({
    boards
  });
});

app.get('/issues', authMiddelware, (req, res) => {
  const userId = req.userId;
  const boardId = parseInt(req.query.boardId);

  const board = BOARDS.find(b => b.id === boardId);
  if(!board){
    return res.status(404).json({
      message: "board not found"
    });
  }

  const organization = ORGANIZATIONS.find(org => org.id === board.organizationId);
  if(!organization){
    return res.status(404).json({
      message: "org doesnt exists"
    });
  }

  const isMember = organization.admin === userId || 
                    organization.members.includes(userId);

  if(!isMember){
    return res.status(403).json({
      message: "you are not a member of this org"
    });
  }

  const issues = ISSUES.filter(i => i.boardId === boardId);
  res.json({
    issues
  });
});

app.get('/members', authMiddelware, (req, res) => {
  const userId = req.userId;
  const organizationId = parseInt(req.query.organizationId);

  const organization = ORGANIZATIONS.find(org => org.id === organizationId);
  if(!organization){
    return res.status(404).json({
      message: "org doesnt exists"
    });
  }

  if(organization.admin !== userId){
    return res.status(403).json({
      message: "you are not the admin of this org"
    });
  }

  res.json({
    members: organization.members.map(memberId => {
      const user = USERS.find(u => u.id === memberId);
      return{
        userId: user.id,
        username: user.username
      }
    })
  });
});

//UPDATE

app.put('/issue', authMiddelware, (req, res) => {
  const userId = req.userId;
  const issueId = parseInt(req.query.issueId);

  const issue = ISSUES.find(i => i.id === issueId);
  if(!issue){
    return res.status(404).json({
      message: "issue not found"
    });
  }
  const board = BOARDS.find(b => b.id === issue.boardId);
  if(!board){
    return res.status(404).json({
      message: "board not found"
    });
  }

  const organization = ORGANIZATIONS.find(org => org.id === board.organizationId);
  if(!organization){
    return  res.status(404).json({
      message: "org not found"
    });
  }

  const isMember = organization.admin === userId ||
                    organization.members.includes(userId);

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

  res.json({
    message: "issue updated",
    issue
  });
});

//DELETE
app.delete('/members', authMiddelware, (req, res) => {
  const userId = req.userId;
  const organizationId = req.body.organizationId;
  const memberUsername = req.body.memberUsername;

  const organization = ORGANIZATIONS.find(org => org.id === organizationId);

  if(!organization){
    return res.status(404).json({
      message: "this org doesnt exists"
    });
  }
  if(organization.admin !== userId){
    return res.status(403).json({
      message: "only admin can remove members"
    });
  }

  const member = USERS.find(u => u.username === memberUsername);

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

  organization.members = organization.members.filter(id => id !== member.id);
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