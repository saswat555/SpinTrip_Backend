const { Blog,BlogComment } = require('../Models');
const uuid = require('uuid');
const multerS3 = require('multer-s3');
const s3 = require('../s3Config');
const multer = require('multer');

const createBlog = async (req, res) => {
  try {
    let blogId = uuid.v4();
    const { blogName, blogAuthor, description,keywords } = req.body;
    const carImage1 = req.files['blogImage_1'] ? req.files['blogImage_1'][0].location : null;
    const carImage2 = req.files['blogImage_2'] ? req.files['blogImage_2'][0].location : null;
    const blog = await Blog.create({ 
    blogId:blogId, 
    blogName:blogName, 
    blogAuthor:blogAuthor, 
    description:description, 
    keywords:keywords, 
    carImage1:carImage1,
    carImage2:carImage2 });
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
    const carImage1 = req.files['blogImage_1'] ? req.files['blogImage_1'][0].location : null;
    const carImage2 = req.files['blogImage_2'] ? req.files['blogImage_2'][0].location : null;

    const [updated] = await Blog.update(
      {
        blogName: blogName,
        blogAuthor: blogAuthor,
        description: description,
        keywords: keywords,
        carImage1: carImage1,
        carImage2: carImage2
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
      res.status(204).json({ message: 'Blog deleted' });
    } else {
      res.status(404).json({ message: 'Blog not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
module.exports = {createBlog, getAllBlogs, updateBlog, deleteBlog};