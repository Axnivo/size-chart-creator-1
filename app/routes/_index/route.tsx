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
        <h1 className={styles.heading}>Collections Creator for Shopify</h1>
        <p className={styles.text}>
          Easily create and manage product collections in your Shopify store.
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
            <strong>Bulk Collection Creation</strong>. Create multiple collections
            at once to organize your products efficiently.
          </li>
          <li>
            <strong>Smart Categorization</strong>. Automatically organize products
            into collections based on tags, types, or vendors.
          </li>
          <li>
            <strong>Easy Management</strong>. Update and manage all your collections
            from a single, intuitive dashboard.
          </li>
        </ul>
      </div>
    </div>
  );
}
