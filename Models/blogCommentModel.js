module.exports = (sequelize, DataTypes) => {
    const BlogComment = sequelize.define("BlogComment", {
      blogId: {
        type: DataTypes.STRING(36),
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      blogCommentName: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      blogCommentEmail: {
        type: DataTypes.STRING(36),
        allowNull: false
      },
      description: {
        type: DataTypes.STRING(2000),
      },
      flag: DataTypes.BOOLEAN,
      timestamp: DataTypes.DATE,

      
      
    });
  
    return BlogComment;
  };
  