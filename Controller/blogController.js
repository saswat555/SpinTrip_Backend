const { Blog, BlogComment } = require('../Models');
const uuid = require('uuid');
const multerS3 = require('multer-s3');
const s3 = require('../s3Config');
const multer = require('multer');
const path = require('path');

const s3Config = multerS3({
  s3: s3,
  bucket: 'spintrip-bucket', // Replace with your actual bucket name
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (req, file, cb) {
    const blogId = req.body.blogId ? req.body.blogId : uuid.v4();
    const fileName = `${blogId}/${file.fieldname}${path.extname(file.originalname)}`;
    cb(null, fileName);
  }
});

const upload = multer({ storage: s3Config });

const createBlog = async (req, res) => {
  try {
    const blogId = uuid.v4();
    const { blogName, blogAuthor, description, keywords } = req.body;
    const blogImage1 = req.files['blogImage_1'] ? req.files['blogImage_1'][0].location : null;
    const blogImage2 = req.files['blogImage_2'] ? req.files['blogImage_2'][0].location : null;

    const blog = await Blog.create({
      blogId: blogId,
      blogName: blogName,
      blogAuthor: blogAuthor,
      description: description,
      keywords: keywords,
      blogImage1: blogImage1,
      blogImage2: blogImage2
    });

    res.status(201).json(blog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.findAll();
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findOne({ where: { blogId: id } });
    if (blog) {
      res.status(200).json(blog);
    } else {
      res.status(404).json({ message: 'Blog not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateBlog = async (req, res) => {
  try {
    const { id, blogName, blogAuthor, description, keywords } = req.body;
    const blogImage1 = req.files['blogImage_1'] ? req.files['blogImage_1'][0].location : null;
    const blogImage2 = req.files['blogImage_2'] ? req.files['blogImage_2'][0].location : null;

    const [updated] = await Blog.update(
      {
        blogName: blogName,
        blogAuthor: blogAuthor,
        description: description,
        keywords: keywords,
        blogImage1: blogImage1,
        blogImage2: blogImage2
      },
      { where: { blogId: id } }
    );

    if (updated) {
      const updatedBlog = await Blog.findOne({ where: { blogId: id } });
      res.status(200).json(updatedBlog);
    } else {
      res.status(404).json({ message: 'Blog not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Blog.destroy({ where: { blogId: id } });

    if (deleted) {
      res.status(200).json({ message: 'Blog deleted' });
    } else {
      res.status(404).json({ message: 'Blog not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog
};
