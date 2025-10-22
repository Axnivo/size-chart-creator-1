import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  // Always show the form on the landing page
  return { showForm: true };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Size Chart Creator for Shopify</h1>
        <p className={styles.text}>
          Create beautiful, responsive size charts for your Shopify products.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Easy Size Chart Creation</strong>. Create professional size charts
            with intuitive drag-and-drop interface.
          </li>
          <li>
            <strong>Responsive Design</strong>. Size charts look perfect on all devices -
            desktop, tablet, and mobile.
          </li>
          <li>
            <strong>Product Integration</strong>. Seamlessly add size charts to your
            product pages with one click.
          </li>
        </ul>
      </div>
    </div>
  );
}
