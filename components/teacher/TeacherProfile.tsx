import React, { useState } from 'react';

const TeacherProfile = () => {
  const [profileData, setProfileData] = useState({
    name: '',
    subject: '',
    bio: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    // Here you will handle the form submission, probably sending the data to the backend
    console.log('Profile submitted for approval:', profileData);
  };

  return (
    <div>
      <h3>Submit your profile for approval</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name:</label>
          <input
            type="text"
            name="name"
            value={profileData.name}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Subject:</label>
          <input
            type="text"
            name="subject"
            value={profileData.subject}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Bio:</label>
          <textarea
            name="bio"
            value={profileData.bio}
            onChange={handleChange}
          ></textarea>
        </div>
        <button type="button" onClick={handleSubmit}>
          Submit for Approval
        </button>
      </form>
    </div>
  );
};

export default TeacherProfile;
