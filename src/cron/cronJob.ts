import cron from "node-cron";
import { transporter } from '../models/emailServer'; 
import ProductModel from '../models/product';

const scheduleEmailJob = () => {
  cron.schedule('*/2 * * * *', async () => {
    console.log('Running scheduled task: Sending daily product report.');

    try {
      const products = await ProductModel.find();
      if (products.length === 0) {
        console.log('No products found in the database.');
        return;
      }

      // Prepare the content for the email with all products included
      const htmlContent = `
        <h2>Daily Product Report</h2>
        ${products.map(product => `
          <h3>Product: ${product.productname}</h3>
          <table border="1" style="border-collapse: collapse; width: 100%; text-align: left;">
            <thead>
              <tr>
                <th style="padding: 8px; background-color: #f2f2f2;">Field</th>
                <th style="padding: 8px; background-color: #f2f2f2;">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px;">Product Name</td>
                <td style="padding: 8px;">${product.productname}</td>
              </tr>
              <tr>
                <td style="padding: 8px;">Description</td>
                <td style="padding: 8px;">${product.description || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px;">Price</td>
                <td style="padding: 8px;">$${product.price.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px;">Stock</td>
                <td style="padding: 8px;">${product.stock || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px;">Images</td>
                <td style="padding: 8px;">
                  ${Array.isArray(product.images) && product.images.length > 0 
                    ? product.images.map((img: string) => `<img src="${img}" alt="Product Image" width="100" style="margin-right: 5px;" />`).join('') 
                    : 'No images available'}
                </td>
              </tr>
            </tbody>
          </table>
          <hr style="border-top: 1px solid #ddd;" />
        `).join('')}
      `; 

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'santhoshkumareait@gmail.com', 
        subject: 'Product Report using CRON',
        html: htmlContent,
      };

      await transporter.sendMail(mailOptions);
      console.log('Daily email report sent successfully.');
    } catch (error) {
      console.error('Error sending daily email:', error);
    }
  });
}; 

export default scheduleEmailJob;
