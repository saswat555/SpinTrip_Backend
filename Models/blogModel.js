module.exports = (sequelize, DataTypes) => {
    const Blog = sequelize.define("Blog", {
      blogId: {
        type: DataTypes.STRING(36),
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      blogName: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      blogAuthor: {
        type: DataTypes.STRING(36),
        allowNull: false
      },
      description: {
        type: DataTypes.STRING(2000),
      },
      keywords: {
        type: DataTypes.STRING(500),
        allowNull: false
      },
      blogImage1: {
        type: DataTypes.STRING,
        allowNull: false
      },
      blogImage2: {
        type: DataTypes.STRING,
        allowNull: false
      },
      timestamp: DataTypes.DATE,
      
      
    });
  
    return Blog;
  };
  