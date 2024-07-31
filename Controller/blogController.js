const { Blog, BlogComment} = require('../Models');
const uuid = require('uuid');
const blogImageStorage = multerS3({
    s3: s3,
    bucket: 'spintrip-bucket',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const imageNumber = file.fieldname.split('_')[1];
      const fileName = `blogImage_${imageNumber}${path.extname(file.originalname)}`;
      cb(null, `blog/${blogName}/${fileName}`);
    }
  });
const upload = multer({ storage: blogImageStorage });

const createBlog = async (req, res) => {
  try {
    const blogId = uuid.v4();
    const { blogName, blogAuthor, description,keywords, carImage1, carImage2 } = req.body;
    const Blog = await Blog.create({ blogId:blogId, 
    blogName:blogName, 
    blogAuthor:blogAuthor, 
    description:description, 
    keywords:keywords, 
    carImage1:carImage1,
    carImage2:carImage2 });
    res.status(201).json(Blog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {createBlog};